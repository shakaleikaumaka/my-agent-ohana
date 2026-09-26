// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IAqua} from "./IAqua.sol";
import {IERC20} from "./IERC20.sol";

/// @title BlessingPool — an authorizer-gated 1inch Aqua app for the Agent Ohana ceremony
/// @author Globy Tauro (GLOBY squad, ETHGlobal Tokyo 2026)
/// @notice 100% fresh code (MIT). Wraps the 1inch Aqua registry to add the one
///         thing Aqua deliberately lacks: DELEGATION / access control.
///
///         THE CEREMONY (maps 1:1 onto Aqua):
///           bless()  == Aqua.ship()  — the authorizer opens a wage/blessing
///                                       position for a NAMED agent.
///           revoke() == Aqua.dock()  — releases the virtual balance INSTANTLY;
///                                       no token transfer, pure accounting.
///           payWage()== Aqua.pull()  — the live position pays the agent out of
///                                       the treasury (optional demonstration).
///
///         WHY A WRAPPER? Aqua's ship/dock are maker-scoped (msg.sender == maker),
///         so Aqua itself has NO notion of "who may open/close on the treasury's
///         behalf". BlessingPool is BOTH the maker (it holds the blessing funds
///         and approves Aqua) AND the app (address(this) is passed as `app`),
///         and it layers an `authorizer` on top: only the authorizer may bless or
///         revoke. That access-control layer is the entire point of this contract.
contract BlessingPool {
    /// @notice The strategy we hash and ship to Aqua. `maker` is pinned to
    ///         address(this) so the hash is unique to this treasury, and `agent`
    ///         binds the position to the blessed steward.
    struct Strategy {
        address maker; // == address(this)
        address agent; // the blessed / hired agent this wage position is for
        address token0;
        address token1;
        bytes32 salt; // lets the authorizer open multiple positions per agent/pair
    }

    /// @notice Our local mirror of an open blessing, keyed by strategyHash.
    struct Position {
        address agent;
        address token0;
        address token1;
        bool active;
        bytes32 salt;
    }

    IAqua public immutable aqua;
    address public immutable authorizer;

    /// @notice strategyHash => local position record.
    mapping(bytes32 => Position) public positions;

    error NotAuthorizer();
    error PositionAlreadyActive(bytes32 strategyHash);
    error PositionNotActive(bytes32 strategyHash);
    error NotAgentOrAuthorizer();

    event Blessed(
        bytes32 indexed strategyHash,
        address indexed agent,
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1
    );
    event Revoked(bytes32 indexed strategyHash, address indexed agent);
    event WagePaid(bytes32 indexed strategyHash, address indexed agent, address token, uint256 amount);

    modifier onlyAuthorizer() {
        if (msg.sender != authorizer) revert NotAuthorizer();
        _;
    }

    constructor(IAqua _aqua, address _authorizer) {
        aqua = _aqua;
        authorizer = _authorizer;
    }

    /// @notice BLESS == Aqua.ship. The authorizer opens a wage/blessing position
    ///         for `agent`, backed by amounts of token0/token1 that stay in this
    ///         treasury (Aqua only records virtual balances).
    /// @dev We approve Aqua for the EXACT shipped amounts (not max) so a stolen
    ///      pull can never exceed what was blessed — an honesty/safety choice.
    /// @return strategyHash keccak256(abi.encode(strategy)); equals the hash Aqua
    ///         returns because Aqua computes keccak256 over the same bytes.
    function bless(
        address agent,
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        bytes32 salt
    ) external onlyAuthorizer returns (bytes32 strategyHash) {
        Strategy memory s = Strategy({
            maker: address(this),
            agent: agent,
            token0: token0,
            token1: token1,
            salt: salt
        });
        bytes memory strategyBytes = abi.encode(s);
        strategyHash = keccak256(strategyBytes);

        if (positions[strategyHash].active) revert PositionAlreadyActive(strategyHash);

        // Aqua pulls from the maker (us) via our ERC20 approval to the registry.
        IERC20(token0).approve(address(aqua), amount0);
        IERC20(token1).approve(address(aqua), amount1);

        address[] memory tokens = new address[](2);
        tokens[0] = token0;
        tokens[1] = token1;
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = amount0;
        amounts[1] = amount1;

        // We are BOTH maker (msg.sender to Aqua) AND app (address(this)).
        bytes32 shipped = aqua.ship(address(this), strategyBytes, tokens, amounts);
        // Aqua hashes the same bytes we do; assert to catch any encoding drift.
        assert(shipped == strategyHash);

        positions[strategyHash] = Position({
            agent: agent,
            token0: token0,
            token1: token1,
            active: true,
            salt: salt
        });

        emit Blessed(strategyHash, agent, token0, token1, amount0, amount1);
    }

    /// @notice REVOKE == Aqua.dock. Releases the blessing INSTANTLY — Aqua zeroes
    ///         the virtual balances and marks the strategy docked, no transfers.
    ///         After this, safeBalances() reverts and any pull() reverts: the
    ///         agent's wage position is dead the moment the authorizer says stop.
    /// @dev Only the authorizer may revoke. Reverts if the position is not active
    ///      (guards double-revoke before Aqua's own DockingShouldCloseAllTokens).
    function revoke(bytes32 strategyHash) external onlyAuthorizer {
        Position storage p = positions[strategyHash];
        if (!p.active) revert PositionNotActive(strategyHash);

        address[] memory tokens = new address[](2);
        tokens[0] = p.token0;
        tokens[1] = p.token1;

        // dock requires ALL strategy tokens (tokensCount == tokens.length).
        aqua.dock(address(this), strategyHash, tokens);

        p.active = false;
        emit Revoked(strategyHash, p.agent);
    }

    /// @notice PAY WAGE == Aqua.pull (optional demo). The live position pays the
    ///         blessed agent out of the treasury: Aqua decrements the virtual
    ///         balance and transfers `amount` of `token` from this pool -> agent
    ///         using our approval. Callable by the authorizer OR the agent.
    /// @dev After revoke() the position is inactive, so this reverts here (and
    ///      Aqua itself would revert on the zeroed balance) — proving the wage
    ///      stream stops the instant the blessing is withdrawn.
    function payWage(bytes32 strategyHash, address token, uint256 amount) external {
        Position storage p = positions[strategyHash];
        if (!p.active) revert PositionNotActive(strategyHash);
        if (msg.sender != authorizer && msg.sender != p.agent) revert NotAgentOrAuthorizer();

        // msg.sender to Aqua is this app; Aqua pulls maker(this) -> agent.
        aqua.pull(address(this), strategyHash, token, amount, p.agent);
        emit WagePaid(strategyHash, p.agent, token, amount);
    }
}
