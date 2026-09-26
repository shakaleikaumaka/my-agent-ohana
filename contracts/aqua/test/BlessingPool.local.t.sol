// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {BlessingPool} from "../src/BlessingPool.sol";
import {IAqua} from "../src/IAqua.sol";
import {MockAqua} from "./MockAqua.sol";
import {MockERC20} from "./MockERC20.sol";

/// @title BlessingPool — OFFLINE test path (MockAqua test double)
/// @notice Always green with a plain `forge test`, no network required. Runs the
///         full ceremony (bless -> pay wage -> revoke) against a faithful test
///         double of the documented Aqua semantics. The authentic counterpart is
///         BlessingPool.fork.t.sol (mainnet fork; runs under RUN_FORK=1).
contract BlessingPoolLocalTest is Test {
    MockAqua internal aqua;
    BlessingPool internal pool;
    MockERC20 internal token0;
    MockERC20 internal token1;

    address internal authorizer = makeAddr("authorizer");
    address internal agent = makeAddr("agent");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant AMT0 = 10 ether;
    uint256 internal constant AMT1 = 20_000e6; // usdc-ish scale, MockERC20 handles any decimals
    bytes32 internal constant SALT = keccak256("blessing-1");

    function setUp() public {
        aqua = new MockAqua();
        pool = new BlessingPool(IAqua(address(aqua)), authorizer);
        token0 = new MockERC20("Wrapped Ether", "WETH", 18);
        token1 = new MockERC20("USD Coin", "USDC", 6);

        // Fund the treasury (the pool is the maker; tokens stay in its wallet).
        token0.mint(address(pool), AMT0);
        token1.mint(address(pool), AMT1);
    }

    function _bless() internal returns (bytes32) {
        vm.prank(authorizer);
        return pool.bless(agent, address(token0), address(token1), AMT0, AMT1, SALT);
    }

    /// ship=bless: after blessing, Aqua shows the shipped virtual balances active.
    function test_ship_opens_position() public {
        bytes32 h = _bless();

        (uint248 raw0, uint8 tc0) = aqua.rawBalances(address(pool), address(pool), h, address(token0));
        (uint248 raw1, uint8 tc1) = aqua.rawBalances(address(pool), address(pool), h, address(token1));
        assertEq(raw0, AMT0, "raw0");
        assertEq(raw1, AMT1, "raw1");
        assertEq(tc0, 2, "tokensCount0");
        assertEq(tc1, 2, "tokensCount1");

        (uint256 b0, uint256 b1) = aqua.safeBalances(address(pool), address(pool), h, address(token0), address(token1));
        assertEq(b0, AMT0, "safe0");
        assertEq(b1, AMT1, "safe1");

        (address pAgent,,, bool active,) = pool.positions(h);
        assertEq(pAgent, agent, "agent");
        assertTrue(active, "active");

        // Exact-amount approval (honesty/safety: never approve max).
        assertEq(token0.allowance(address(pool), address(aqua)), AMT0, "allow0");
        assertEq(token1.allowance(address(pool), address(aqua)), AMT1, "allow1");
    }

    /// dock=revoke: after revoke the balance is released instantly (== 0, docked)
    /// and safeBalances reverts — the instant release.
    function test_dock_releases_balance() public {
        bytes32 h = _bless();

        vm.prank(authorizer);
        pool.revoke(h);

        (uint248 raw0, uint8 tc0) = aqua.rawBalances(address(pool), address(pool), h, address(token0));
        (uint248 raw1, uint8 tc1) = aqua.rawBalances(address(pool), address(pool), h, address(token1));
        assertEq(raw0, 0, "raw0 zeroed");
        assertEq(raw1, 0, "raw1 zeroed");
        assertEq(tc0, 0xff, "docked0");
        assertEq(tc1, 0xff, "docked1");

        vm.expectRevert(
            abi.encodeWithSelector(
                IAqua.SafeBalancesForTokenNotInActiveStrategy.selector,
                address(pool),
                address(pool),
                h,
                address(token0)
            )
        );
        aqua.safeBalances(address(pool), address(pool), h, address(token0), address(token1));

        (,,, bool active,) = pool.positions(h);
        assertFalse(active, "inactive");
    }

    /// access control: a non-authorizer can neither bless nor revoke.
    function test_only_authorizer_can_dock() public {
        bytes32 h = _bless();

        vm.prank(stranger);
        vm.expectRevert(BlessingPool.NotAuthorizer.selector);
        pool.revoke(h);

        vm.prank(stranger);
        vm.expectRevert(BlessingPool.NotAuthorizer.selector);
        pool.bless(agent, address(token0), address(token1), AMT0, AMT1, keccak256("other"));
    }

    /// double revoke: revoking an already-revoked strategy reverts.
    function test_double_dock_reverts() public {
        bytes32 h = _bless();

        vm.prank(authorizer);
        pool.revoke(h);

        vm.prank(authorizer);
        vm.expectRevert(abi.encodeWithSelector(BlessingPool.PositionNotActive.selector, h));
        pool.revoke(h);
    }

    /// bonus: the live position pays the agent, then payment is blocked once the
    /// blessing is revoked.
    function test_wage_paid_then_blocked_after_revoke() public {
        bytes32 h = _bless();

        uint256 wage = 3 ether;
        vm.prank(agent);
        pool.payWage(h, address(token0), wage);

        assertEq(token0.balanceOf(agent), wage, "agent paid");
        assertEq(token0.balanceOf(address(pool)), AMT0 - wage, "treasury debited");
        (uint248 raw0,) = aqua.rawBalances(address(pool), address(pool), h, address(token0));
        assertEq(raw0, AMT0 - wage, "virtual balance decremented");

        // Revoke, then the wage stream must be dead.
        vm.prank(authorizer);
        pool.revoke(h);

        vm.prank(agent);
        vm.expectRevert(abi.encodeWithSelector(BlessingPool.PositionNotActive.selector, h));
        pool.payWage(h, address(token0), wage);
    }

    /// access control on wage: a stranger cannot drain the position.
    function test_only_agent_or_authorizer_can_pay_wage() public {
        bytes32 h = _bless();
        vm.prank(stranger);
        vm.expectRevert(BlessingPool.NotAgentOrAuthorizer.selector);
        pool.payWage(h, address(token0), 1 ether);
    }
}
