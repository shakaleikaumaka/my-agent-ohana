// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {BlessingPool} from "../src/BlessingPool.sol";
import {PoolGuard} from "../src/PoolGuard.sol";
import {IAqua} from "../src/IAqua.sol";
import {MockERC20} from "../test/MockERC20.sol";
import {Aqua} from "aqua/src/Aqua.sol";

/// @title DeploySepolia — the full Agent Ohana × 1inch Aqua lane, on a PUBLIC chain
/// @notice Deploys, in order:
///   1. the 1inch Aqua registry (hackathon testnet redeploy — no official Sepolia
///      deployment exists; source: lib/aqua submodule, github.com/1inch/aqua,
///      LicenseRef-Degensoft-Aqua-Source-1.1; redeploys for hackathon testing
///      were explicitly welcomed at the ETHGlobal Tokyo Aqua workshop)
///   2. two demo ERC20s (GIFT / ALOHA) minted to the BlessingPool treasury
///   3. BlessingPool (authorizer = deployer EOA)
///   4. one REAL shipped strategy: bless(trace.myagentohana.eth owner)
///   5. PoolGuard (attester = steward EOA) bound to that strategyHash
/// Env: DEPLOYER_PK, ATTESTER_ADDR, TRACE_AGENT
contract DeploySepolia is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PK");
        address attester = vm.envAddress("ATTESTER_ADDR");
        address traceAgent = vm.envAddress("TRACE_AGENT");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);

        Aqua aqua = new Aqua();
        console.log("AQUA_REGISTRY", address(aqua));

        MockERC20 gift = new MockERC20("Ohana Gift", "GIFT", 18);
        MockERC20 aloha = new MockERC20("Aloha Note", "ALOHA", 18);
        console.log("GIFT", address(gift));
        console.log("ALOHA", address(aloha));

        BlessingPool pool = new BlessingPool(IAqua(address(aqua)), deployer);
        console.log("BLESSING_POOL", address(pool));

        // Treasury: tokens live in the pool; Aqua only ever records virtual balances.
        gift.mint(address(pool), 10_000 ether);
        aloha.mint(address(pool), 10_000 ether);

        bytes32 strategyHash = pool.bless(
            traceAgent,
            address(gift),
            address(aloha),
            1_000 ether,
            1_000 ether,
            keccak256("tokyo-2026-harvest-moon")
        );
        console.log("STRATEGY_HASH");
        console.logBytes32(strategyHash);

        PoolGuard guard = new PoolGuard(attester, strategyHash);
        console.log("POOL_GUARD", address(guard));

        vm.stopBroadcast();
    }
}
