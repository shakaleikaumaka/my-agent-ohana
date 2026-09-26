// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title IAqua — minimal interface for the 1inch Aqua Shared Liquidity Layer
/// @notice This is OUR OWN hand-authored interface, declaring ONLY the subset of
///         the real Aqua registry that BlessingPool actually calls. It is not a
///         copy of the upstream file; it is a thin ABI surface derived from the
///         public 1inch Aqua interface (LicenseRef-Degensoft-Aqua-Source-1.1,
///         © 2025 Degensoft Ltd) so we can talk to the deployed registry.
///
///         Deployed mainnet registry (deterministic, same address every chain):
///           Aqua registry = 0x1111113ccf1426a8e30e2bff5e005d929bf6a90a
///
///         Semantics (verified against 1inch/aqua src/Aqua.sol):
///         - Aqua stores VIRTUAL balances keyed by (maker, app, strategyHash, token).
///           Tokens never leave the maker's wallet; Aqua only pulls them at fill
///           time via the maker's ERC20 approval to the registry.
///         - ship/dock are MAKER-scoped: msg.sender IS the maker. Aqua has no
///           native delegation, which is exactly why an app/wrapper layer
///           (BlessingPool) is required for authorizer access control.
interface IAqua {
    // ── Errors we assert on in tests ──────────────────────────────────────────
    error MaxNumberOfTokensExceeded(uint256 tokensCount, uint256 maxTokensCount);
    error StrategiesMustBeImmutable(address app, bytes32 strategyHash);
    error DockingShouldCloseAllTokens(address app, bytes32 strategyHash);
    error PushToNonActiveStrategyPrevented(address maker, address app, bytes32 strategyHash, address token);
    error SafeBalancesForTokenNotInActiveStrategy(address maker, address app, bytes32 strategyHash, address token);

    // ── Events (for reference / decoding) ─────────────────────────────────────
    event Shipped(address maker, address app, bytes32 strategyHash, bytes strategy);
    event Docked(address maker, address app, bytes32 strategyHash);
    event Pulled(address maker, address app, bytes32 strategyHash, address token, uint256 amount);
    event Pushed(address maker, address app, bytes32 strategyHash, address token, uint256 amount);

    /// @notice Opens a strategy (msg.sender = maker); returns keccak256(strategy).
    ///         Reverts StrategiesMustBeImmutable if any (maker,app,hash,token)
    ///         balance already exists.
    function ship(
        address app,
        bytes calldata strategy,
        address[] calldata tokens,
        uint256[] calldata amounts
    ) external returns (bytes32 strategyHash);

    /// @notice Deactivates a strategy (msg.sender = maker), zeroing all balances.
    ///         Requires ALL strategy tokens (tokensCount == tokens.length).
    function dock(address app, bytes32 strategyHash, address[] calldata tokens) external;

    /// @notice App-scoped (msg.sender = app): decrements the virtual balance and
    ///         transfers maker -> `to` via the maker's ERC20 approval to Aqua.
    function pull(address maker, bytes32 strategyHash, address token, uint256 amount, address to) external;

    /// @notice Transfers caller -> maker and increases the balance. Reverts
    ///         PushToNonActiveStrategyPrevented if the strategy is not active.
    function push(address maker, address app, bytes32 strategyHash, address token, uint256 amount) external;

    /// @notice Raw (unchecked) virtual balance view. tokensCount: 0 = inactive,
    ///         0xff = docked, else the number of tokens in the strategy.
    function rawBalances(
        address maker,
        address app,
        bytes32 strategyHash,
        address token
    ) external view returns (uint248 balance, uint8 tokensCount);

    /// @notice Checked two-token balance view. Reverts
    ///         SafeBalancesForTokenNotInActiveStrategy if either token is not
    ///         part of an active strategy.
    function safeBalances(
        address maker,
        address app,
        bytes32 strategyHash,
        address token0,
        address token1
    ) external view returns (uint256 balance0, uint256 balance1);
}
