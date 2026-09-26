// SPDX-License-Identifier: CC0-1.0
pragma solidity 0.8.30;

// ─────────────────────────────────────────────────────────────────────────────
// 1inch Aqua base contracts. These are REFERENCED via the pinned `lib/aqua`
// git submodule (1inch/aqua @ ef24220) and remain under their own license
// (LicenseRef-Degensoft-Aqua-Source-1.1, © 2025 Degensoft Ltd). Nothing from
// that repo is copied into this CC0 project — we inherit the *real* AquaApp so
// our swap runs on the identical reentrancy/settlement primitives that the
// deployed registry expects.
// ─────────────────────────────────────────────────────────────────────────────
import {AquaApp} from "aqua/src/AquaApp.sol";
import {IAqua} from "aqua/src/interfaces/IAqua.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title IBlessingSwapCallback — the taker's flash-settlement hook
/// @notice Aqua swaps are flash-swaps: the app first PULLS the output token to
///         the taker, then calls this hook, inside which the taker must PUSH the
///         input token to the maker (`AQUA.push`). The app then verifies the
///         push landed via `_safeCheckAquaPush`. If the taker doesn't pay, the
///         whole swap reverts atomically — the maker can never be short-changed.
interface IBlessingSwapCallback {
    function blessingSwapCallback(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address maker,
        address app,
        bytes32 strategyHash,
        bytes calldata takerData
    ) external;
}

/// @title BlessingSwap — a SwapVM-native 1inch Aqua application for the Agent Ohana ceremony
/// @author Globy Tauro 🐂 (GLOBY squad, ETHGlobal Tokyo 2026)
/// @notice 100% fresh authored code (CC0). This is the DEEP rung of the Blessing
///         Pool: a genuine `AquaApp` with an on-chain constant-product swap, not a
///         shallow ship/dock/pull wrapper. It layers onto Aqua the one thing Aqua
///         deliberately lacks — DELEGATION / access control — while remaining a
///         real, tradeable strategy.
///
///         THE CEREMONY, mapped 1:1 onto the Aqua strategy lifecycle:
///
///           bless()      == Aqua.ship()  — the verified human's authorizer OPENS a
///                                           gift as a live Aqua strategy for a NAMED
///                                           steward agent. ZERO token movement: Aqua
///                                           only records virtual balances (allowances)
///                                           against the maker's wallet. That is the
///                                           magic — the gift is live but nothing has
///                                           left the treasury.
///
///           swapExactIn()               — a taker trades against the blessing. This is
///                                           the ONLY moment real ERC-20s move: the app
///                                           PULLS the output token from the maker to the
///                                           taker, the taker's callback PUSHES the input
///                                           token back, and `_safeCheckAquaPush` proves it.
///
///           reship()     == dock()+ship() — the blessed STEWARD (weekend delta) re-
///                                           parameterizes the gift (new fee / new size).
///                                           Aqua strategies are immutable, so a change is
///                                           a graceful dock of the old + ship of the new.
///
///           revoke()     == Aqua.dock()  — the human says stop. The strategy is docked
///                                           INSTANTLY (pure accounting, no transfer); the
///                                           very next swap reverts because safeBalances()
///                                           reverts. The blessing is dead the moment
///                                           consent is withdrawn.
///
///         WHY A WRAPPER-APP? Aqua's ship/dock are maker-scoped (msg.sender == maker),
///         so Aqua itself has NO notion of "who may open/close on the treasury's behalf".
///         BlessingSwap is simultaneously the MAKER (it custodies the gift and approves
///         Aqua), the APP (address(this) is the strategy's app), and the AUTHORIZER GATE
///         (only `authorizer` may bless/revoke; only the named `steward` or authorizer may
///         re-ship). That access-control layer is the entire point.
contract BlessingSwap is AquaApp {
    using Math for uint256;

    // ── The strategy: Aqua's immutable, ABI-encoded config identified by its hash ──
    /// @param maker      Pinned to address(this): the treasury custodying the gift.
    /// @param token0     First token of the pair.
    /// @param token1     Second token of the pair.
    /// @param feeBps     Swap fee in basis points (1 bps = 0.01%).
    /// @param steward    WEEKEND DELTA — the blessed agent permitted to re-ship this gift.
    /// @param blessingId WEEKEND DELTA — ties this strategy to the World-ID/ENS blessing
    ///                   ceremony (e.g. keccak of the ENS subname + consent nonce).
    /// @param salt       Distinguishes otherwise-identical strategies / re-ships.
    struct Strategy {
        address maker;
        address token0;
        address token1;
        uint256 feeBps;
        address steward;
        bytes32 blessingId;
        bytes32 salt;
    }

    /// @notice Local mirror of a blessing, keyed by strategyHash — powers our
    ///         delegation layer (Aqua has no per-strategy roles of its own).
    struct Blessing {
        address steward;
        bytes32 blessingId;
        bool active;
    }

    /// @notice Base for basis-point math (100% = 10_000 bps).
    uint256 internal constant BPS_BASE = 10_000;

    /// @notice The authorizer = the verified human's on-chain agent (World-ID gated
    ///         off-chain). Only it may bless / revoke.
    address public immutable authorizer;

    /// @notice strategyHash => local blessing record.
    mapping(bytes32 => Blessing) public blessings;

    // ── Errors ──────────────────────────────────────────────────────────────────
    error NotAuthorizer();
    error NotStewardOrAuthorizer();
    error WrongMaker(address expected, address got);
    error BlessingAlreadyActive(bytes32 strategyHash);
    error BlessingNotActive(bytes32 strategyHash);
    error ReshipMustKeepBlessing(); // steward/blessingId must be preserved across a re-ship
    error InsufficientOutputAmount(uint256 amountOut, uint256 amountOutMin);

    // ── Events ──────────────────────────────────────────────────────────────────
    event Blessed(
        bytes32 indexed strategyHash,
        address indexed steward,
        bytes32 indexed blessingId,
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        uint256 feeBps
    );
    event Swapped(
        bytes32 indexed strategyHash,
        address indexed taker,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    event Reshipped(
        bytes32 indexed oldStrategyHash,
        bytes32 indexed newStrategyHash,
        address indexed steward,
        bytes32 blessingId
    );
    event Revoked(bytes32 indexed strategyHash, address indexed steward, bytes32 indexed blessingId);

    modifier onlyAuthorizer() {
        if (msg.sender != authorizer) revert NotAuthorizer();
        _;
    }

    /// @param aqua_       The Aqua registry (0x1111113CCf… on every supported chain).
    /// @param authorizer_ The blessing authority (the verified human's agent address).
    constructor(IAqua aqua_, address authorizer_) AquaApp(aqua_) {
        authorizer = authorizer_;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // BLESS  ==  Aqua.ship  (authorizer-gated)
    // ─────────────────────────────────────────────────────────────────────────────

    /// @notice Opens `s` as a live Aqua strategy for `s.steward`. Approves Aqua for
    ///         EXACTLY the shipped amounts (not max) so a rogue pull can never exceed
    ///         what was blessed. No tokens move here — Aqua records virtual balances only.
    /// @dev    `s.maker` MUST equal address(this): this contract is the maker.
    /// @return strategyHash keccak256(abi.encode(s)) — identical to Aqua's own hash.
    function bless(
        Strategy calldata s,
        uint256 amount0,
        uint256 amount1
    ) external onlyAuthorizer returns (bytes32 strategyHash) {
        if (s.maker != address(this)) revert WrongMaker(address(this), s.maker);
        strategyHash = keccak256(abi.encode(s));
        if (blessings[strategyHash].active) revert BlessingAlreadyActive(strategyHash);

        // Exact-amount approvals: the blessing can never pull more than it granted.
        IERC20(s.token0).approve(address(AQUA), amount0);
        IERC20(s.token1).approve(address(AQUA), amount1);

        address[] memory tokens = new address[](2);
        tokens[0] = s.token0;
        tokens[1] = s.token1;
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = amount0;
        amounts[1] = amount1;

        // msg.sender to Aqua is address(this) = maker; app is also address(this).
        bytes32 shipped = AQUA.ship(address(this), abi.encode(s), tokens, amounts);
        assert(shipped == strategyHash); // catch any ABI-encoding drift vs Aqua

        blessings[strategyHash] = Blessing({steward: s.steward, blessingId: s.blessingId, active: true});
        emit Blessed(strategyHash, s.steward, s.blessingId, s.token0, s.token1, amount0, amount1, s.feeBps);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // SWAP  —  the ONLY place real ERC-20s move (flash-swap: pull → callback push → verify)
    // ─────────────────────────────────────────────────────────────────────────────

    /// @notice Trade against a live blessing with an exact input amount.
    /// @param s           The full strategy (published in the Blessed event).
    /// @param zeroForOne  true = give token0, receive token1; false = the reverse.
    /// @param amountIn    Exact input the taker will push to the maker.
    /// @param amountOutMin Slippage floor on the output.
    /// @param to          Recipient of the output token.
    /// @param takerData   Opaque data forwarded to the taker's settlement callback.
    /// @return amountOut  The constant-product output actually paid.
    /// @dev `nonReentrantStrategy` is REQUIRED — `_safeCheckAquaPush` reverts without it.
    function swapExactIn(
        Strategy calldata s,
        bool zeroForOne,
        uint256 amountIn,
        uint256 amountOutMin,
        address to,
        bytes calldata takerData
    ) external nonReentrantStrategy(s.maker, keccak256(abi.encode(s))) returns (uint256 amountOut) {
        bytes32 strategyHash = keccak256(abi.encode(s));

        (address tokenIn, address tokenOut, uint256 balanceIn, uint256 balanceOut) =
            _getInAndOut(s, strategyHash, zeroForOne);

        amountOut = _quoteExactIn(s.feeBps, balanceIn, balanceOut, amountIn);
        if (amountOut < amountOutMin) revert InsufficientOutputAmount(amountOut, amountOutMin);

        // 1) Pull the output from the maker (address(this)) to the taker's recipient.
        AQUA.pull(s.maker, strategyHash, tokenOut, amountOut, to);

        // 2) Hand control to the taker: they must push `amountIn` of tokenIn to the maker.
        IBlessingSwapCallback(msg.sender).blessingSwapCallback(
            tokenIn, tokenOut, amountIn, amountOut, s.maker, address(this), strategyHash, takerData
        );

        // 3) Prove the input landed — atomically reverts the whole swap if it didn't.
        _safeCheckAquaPush(s.maker, strategyHash, tokenIn, balanceIn + amountIn);

        emit Swapped(strategyHash, msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }

    /// @notice Off-chain quote for an exact-input swap (reverts if the blessing is docked).
    function quoteExactIn(
        Strategy calldata s,
        bool zeroForOne,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        bytes32 strategyHash = keccak256(abi.encode(s));
        (, , uint256 balanceIn, uint256 balanceOut) = _getInAndOut(s, strategyHash, zeroForOne);
        amountOut = _quoteExactIn(s.feeBps, balanceIn, balanceOut, amountIn);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // RESHIP  ==  dock + ship  (steward or authorizer)  — "the agent stewards the gift"
    // ─────────────────────────────────────────────────────────────────────────────

    /// @notice Re-parameterize a live blessing: dock the old strategy and ship a new one.
    ///         The steward binding is INVARIANT — `newS` must keep the same `steward` and
    ///         `blessingId` as `oldS` (only fee / size / salt may change). Any strategy
    ///         balance still resting in the maker's wallet is re-shipped verbatim unless
    ///         the caller supplies new amounts.
    /// @param oldS    The currently-active strategy.
    /// @param newS    The replacement strategy (same steward + blessingId, new params/salt).
    /// @param amount0 token0 balance to allocate to the new strategy.
    /// @param amount1 token1 balance to allocate to the new strategy.
    /// @return newStrategyHash keccak256(abi.encode(newS)).
    function reship(
        Strategy calldata oldS,
        Strategy calldata newS,
        uint256 amount0,
        uint256 amount1
    ) external returns (bytes32 newStrategyHash) {
        bytes32 oldHash = keccak256(abi.encode(oldS));
        Blessing storage b = blessings[oldHash];
        if (!b.active) revert BlessingNotActive(oldHash);
        // Only the named steward (the blessed agent) or the authorizer may steward the gift.
        if (msg.sender != b.steward && msg.sender != authorizer) revert NotStewardOrAuthorizer();
        // The blessing identity must survive a re-ship — a steward re-tunes, never re-assigns.
        if (newS.steward != oldS.steward || newS.blessingId != oldS.blessingId) revert ReshipMustKeepBlessing();
        if (newS.maker != address(this)) revert WrongMaker(address(this), newS.maker);

        // Dock the old strategy (all its tokens) → instant, pure accounting.
        address[] memory oldTokens = new address[](2);
        oldTokens[0] = oldS.token0;
        oldTokens[1] = oldS.token1;
        AQUA.dock(address(this), oldHash, oldTokens);
        b.active = false;

        // Ship the replacement.
        newStrategyHash = keccak256(abi.encode(newS));
        if (blessings[newStrategyHash].active) revert BlessingAlreadyActive(newStrategyHash);
        IERC20(newS.token0).approve(address(AQUA), amount0);
        IERC20(newS.token1).approve(address(AQUA), amount1);
        address[] memory newTokens = new address[](2);
        newTokens[0] = newS.token0;
        newTokens[1] = newS.token1;
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = amount0;
        amounts[1] = amount1;
        bytes32 shipped = AQUA.ship(address(this), abi.encode(newS), newTokens, amounts);
        assert(shipped == newStrategyHash);

        blessings[newStrategyHash] = Blessing({steward: newS.steward, blessingId: newS.blessingId, active: true});
        emit Reshipped(oldHash, newStrategyHash, newS.steward, newS.blessingId);
        emit Blessed(
            newStrategyHash, newS.steward, newS.blessingId, newS.token0, newS.token1, amount0, amount1, newS.feeBps
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // REVOKE  ==  Aqua.dock  (authorizer-gated) — consent withdrawn, blessing dies NOW
    // ─────────────────────────────────────────────────────────────────────────────

    /// @notice Instantly docks the blessing. After this, safeBalances() reverts, so the
    ///         next swapExactIn reverts too — the gift is dead the moment the human stops.
    function revoke(Strategy calldata s) external onlyAuthorizer {
        bytes32 strategyHash = keccak256(abi.encode(s));
        Blessing storage b = blessings[strategyHash];
        if (!b.active) revert BlessingNotActive(strategyHash);

        address[] memory tokens = new address[](2);
        tokens[0] = s.token0;
        tokens[1] = s.token1;
        AQUA.dock(address(this), strategyHash, tokens); // requires ALL strategy tokens

        b.active = false;
        emit Revoked(strategyHash, b.steward, b.blessingId);
    }

    // ── internal pricing / balance helpers (constant product x*y=k after fee) ─────
    function _getInAndOut(
        Strategy calldata s,
        bytes32 strategyHash,
        bool zeroForOne
    ) private view returns (address tokenIn, address tokenOut, uint256 balanceIn, uint256 balanceOut) {
        tokenIn = zeroForOne ? s.token0 : s.token1;
        tokenOut = zeroForOne ? s.token1 : s.token0;
        // Reverts SafeBalancesForTokenNotInActiveStrategy if the blessing is docked.
        (balanceIn, balanceOut) = AQUA.safeBalances(s.maker, address(this), strategyHash, tokenIn, tokenOut);
    }

    function _quoteExactIn(
        uint256 feeBps,
        uint256 balanceIn,
        uint256 balanceOut,
        uint256 amountIn
    ) internal pure returns (uint256 amountOut) {
        uint256 amountInWithFee = (amountIn * (BPS_BASE - feeBps)) / BPS_BASE;
        amountOut = (amountInWithFee * balanceOut) / (balanceIn + amountInWithFee);
    }
}
