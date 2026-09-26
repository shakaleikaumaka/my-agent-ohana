// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IAqua} from "../src/IAqua.sol";
import {IERC20} from "../src/IERC20.sol";

/// @title MockAqua — TEST DOUBLE of the 1inch Aqua registry
/// @notice ⚠️ THIS IS A TEST DOUBLE, not the real Aqua. It re-implements the
///         EXACT documented storage semantics of the upstream registry so the
///         offline test path exercises identical behaviour to the live contract
///         at 0x1111113ccf1426a8e30e2bff5e005d929bf6a90a.
///
///         The behavioural logic mirrored here (virtual-balance mapping, ship
///         immutability check, dock closes-all-tokens check, pull decrement +
///         transferFrom, push active-only guard, safeBalances active check) is
///         derived from the public 1inch Aqua source `src/Aqua.sol`
///         (LicenseRef-Degensoft-Aqua-Source-1.1, © 2025 Degensoft Ltd —
///         https://github.com/1inch/aqua). It is reproduced here ONLY as a test
///         fixture; it is never deployed to production and is not our own IP.
///         Our production contract, BlessingPool.sol, is 100% original MIT code
///         and this double stands in for Aqua purely to keep `forge test` green
///         offline. The authentic path is the mainnet fork test.
contract MockAqua is IAqua {
    uint8 private constant _DOCKED = 0xff;

    struct Balance {
        uint248 amount;
        uint8 tokensCount; // 0 = inactive, 0xff = docked, else # tokens in strategy
    }

    mapping(address => mapping(address => mapping(bytes32 => mapping(address => Balance)))) private _balances;

    function rawBalances(
        address maker,
        address app,
        bytes32 strategyHash,
        address token
    ) external view returns (uint248 balance, uint8 tokensCount) {
        Balance storage b = _balances[maker][app][strategyHash][token];
        return (b.amount, b.tokensCount);
    }

    function safeBalances(
        address maker,
        address app,
        bytes32 strategyHash,
        address token0,
        address token1
    ) external view returns (uint256 balance0, uint256 balance1) {
        Balance storage b0 = _balances[maker][app][strategyHash][token0];
        require(
            b0.tokensCount > 0 && b0.tokensCount != _DOCKED,
            SafeBalancesForTokenNotInActiveStrategy(maker, app, strategyHash, token0)
        );
        balance0 = b0.amount;

        Balance storage b1 = _balances[maker][app][strategyHash][token1];
        require(
            b1.tokensCount > 0 && b1.tokensCount != _DOCKED,
            SafeBalancesForTokenNotInActiveStrategy(maker, app, strategyHash, token1)
        );
        balance1 = b1.amount;
    }

    function ship(
        address app,
        bytes calldata strategy,
        address[] calldata tokens,
        uint256[] calldata amounts
    ) external returns (bytes32 strategyHash) {
        strategyHash = keccak256(strategy);
        require(tokens.length < _DOCKED, MaxNumberOfTokensExceeded(tokens.length, _DOCKED - 1));
        uint8 tokensCount = uint8(tokens.length);

        emit Shipped(msg.sender, app, strategyHash, strategy);
        for (uint256 i = 0; i < tokens.length; i++) {
            Balance storage b = _balances[msg.sender][app][strategyHash][tokens[i]];
            require(b.tokensCount == 0, StrategiesMustBeImmutable(app, strategyHash));
            b.amount = uint248(amounts[i]);
            b.tokensCount = tokensCount;
            emit Pushed(msg.sender, app, strategyHash, tokens[i], amounts[i]);
        }
    }

    function dock(address app, bytes32 strategyHash, address[] calldata tokens) external {
        for (uint256 i = 0; i < tokens.length; i++) {
            Balance storage b = _balances[msg.sender][app][strategyHash][tokens[i]];
            require(b.tokensCount == tokens.length, DockingShouldCloseAllTokens(app, strategyHash));
            b.amount = 0;
            b.tokensCount = _DOCKED;
        }
        emit Docked(msg.sender, app, strategyHash);
    }

    function pull(address maker, bytes32 strategyHash, address token, uint256 amount, address to) external {
        Balance storage b = _balances[maker][msg.sender][strategyHash][token];
        // Underflow (post-revoke pull on a zeroed balance) reverts here, exactly
        // as the real registry's `prevBalance - amount` does under 0.8 checks.
        b.amount = b.amount - uint248(amount);
        require(IERC20(token).transferFrom(maker, to, amount), "transferFrom failed");
        emit Pulled(maker, msg.sender, strategyHash, token, amount);
    }

    function push(address maker, address app, bytes32 strategyHash, address token, uint256 amount) external {
        Balance storage b = _balances[maker][app][strategyHash][token];
        require(
            b.tokensCount > 0 && b.tokensCount != _DOCKED,
            PushToNonActiveStrategyPrevented(maker, app, strategyHash, token)
        );
        b.amount = b.amount + uint248(amount);
        require(IERC20(token).transferFrom(msg.sender, maker, amount), "transferFrom failed");
        emit Pushed(maker, app, strategyHash, token, amount);
    }
}
