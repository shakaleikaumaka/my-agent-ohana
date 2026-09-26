// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title IERC20 — minimal ERC20 surface used by BlessingPool
/// @notice Only the methods we call. Hand-authored, not vendored.
interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}
