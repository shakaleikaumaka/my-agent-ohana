// SPDX-License-Identifier: CC0-1.0
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IAqua} from "aqua/src/interfaces/IAqua.sol";
import {BlessingSwap, IBlessingSwapCallback} from "../src/BlessingSwap.sol";

/// @dev A well-behaved taker: settles by pushing the required input token to the
///      maker inside the flash-swap callback. This is the canonical Aqua taker.
///      Shared by the offline and mainnet-fork BlessingSwap test suites.
contract HonestTaker is IBlessingSwapCallback {
    IAqua public immutable aqua;

    constructor(IAqua aqua_) {
        aqua = aqua_;
    }

    function swap(
        BlessingSwap app,
        BlessingSwap.Strategy calldata s,
        bool zeroForOne,
        uint256 amountIn,
        uint256 amountOutMin,
        address to
    ) external returns (uint256) {
        return app.swapExactIn(s, zeroForOne, amountIn, amountOutMin, to, "");
    }

    function blessingSwapCallback(
        address tokenIn,
        address,
        uint256 amountIn,
        uint256,
        address maker,
        address app,
        bytes32 strategyHash,
        bytes calldata
    ) external override {
        IERC20(tokenIn).approve(address(aqua), amountIn);
        aqua.push(maker, app, strategyHash, tokenIn, amountIn);
    }
}

/// @dev A cheating taker: keeps the pulled output but never pushes the input. The
///      swap must revert atomically (AquaApp.MissingTakerAquaPush) so the maker is
///      never short-changed.
contract MaliciousTaker is IBlessingSwapCallback {
    function swap(
        BlessingSwap app,
        BlessingSwap.Strategy calldata s,
        bool zeroForOne,
        uint256 amountIn,
        address to
    ) external returns (uint256) {
        return app.swapExactIn(s, zeroForOne, amountIn, 0, to, "");
    }

    function blessingSwapCallback(
        address, address, uint256, uint256, address, address, bytes32, bytes calldata
    ) external override {
        // Intentionally do nothing — never pay for the pulled output.
    }
}
