// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {PoolGuard} from "../src/PoolGuard.sol";

contract PoolGuardTest is Test {
    PoolGuard guard;
    address attester = makeAddr("attester");
    address stranger = makeAddr("stranger");
    bytes32 strategy = keccak256("blessing-pool-strategy");
    bytes32 humanA = keccak256("world-sub-human-a");
    bytes32 humanB = keccak256("world-sub-human-b");

    function setUp() public {
        guard = new PoolGuard(attester, strategy);
    }

    function test_attester_claims_slot() public {
        vm.prank(attester);
        uint32 idx = guard.claimSlot(humanA);
        assertEq(idx, 1);
        (bool claimed, uint32 index, uint16 cap, uint64 at) = guard.slotOf(humanA);
        assertTrue(claimed);
        assertEq(index, 1);
        assertEq(cap, 100); // 1.00%
        assertGt(at, 0);
        assertEq(guard.slotCount(), 1);
    }

    function test_second_human_gets_second_slot() public {
        vm.startPrank(attester);
        guard.claimSlot(humanA);
        uint32 idx = guard.claimSlot(humanB);
        vm.stopPrank();
        assertEq(idx, 2);
        assertEq(guard.slotCount(), 2);
    }

    function test_same_human_cannot_double_claim() public {
        vm.startPrank(attester);
        guard.claimSlot(humanA);
        vm.expectRevert(abi.encodeWithSelector(PoolGuard.AlreadyClaimed.selector, humanA));
        guard.claimSlot(humanA);
        vm.stopPrank();
        assertEq(guard.slotCount(), 1); // one human, one slot — forever
    }

    function test_stranger_cannot_claim() public {
        vm.prank(stranger);
        vm.expectRevert(PoolGuard.NotAttester.selector);
        guard.claimSlot(humanA);
    }

    function test_unclaimed_reads_empty() public view {
        (bool claimed, uint32 index,,) = guard.slotOf(humanB);
        assertFalse(claimed);
        assertEq(index, 0);
    }
}
