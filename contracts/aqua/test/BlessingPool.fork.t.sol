// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {BlessingPool} from "../src/BlessingPool.sol";
import {IAqua} from "../src/IAqua.sol";
import {IERC20} from "../src/IERC20.sol";

/// @title BlessingPool — AUTHENTIC mainnet-fork test path
/// @notice Runs the ceremony against the REAL, deployed 1inch Aqua registry at
///         0x1111113ccf1426a8e30e2bff5e005d929bf6a90a on an Ethereum-mainnet
///         fork. Tokens are funded with the `deal` cheatcode (WETH + DAI, both
///         deal-friendly). BlessingPool is the maker AND app, and approves Aqua
///         so real ERC20 transfers move during payWage.
///
///         GATING: this suite only forks when RUN_FORK=1 (env). With a plain
///         `forge test` (no env) every test returns early and passes, so the
///         offline MockAqua path stays green with zero network dependency.
///         To run authentically:  RUN_FORK=1 forge test --match-path test/BlessingPool.fork.t.sol -vv
///         Override RPC:           RUN_FORK=1 FORK_RPC=https://rpc.ankr.com/eth forge test ...
contract BlessingPoolForkTest is Test {
    // Deterministic, live mainnet address (codesize-verified in intel).
    address internal constant AQUA = 0x1111113CCf1426A8E30e2bfF5E005d929bF6a90a;
    address internal constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address internal constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;

    IAqua internal aqua = IAqua(AQUA);
    BlessingPool internal pool;

    address internal authorizer = makeAddr("authorizer");
    address internal agent = makeAddr("agent");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant AMT0 = 5 ether; // WETH
    uint256 internal constant AMT1 = 10_000 ether; // DAI (18 dp)
    bytes32 internal constant SALT = keccak256("blessing-fork-1");

    bool internal forkEnabled;

    function setUp() public {
        forkEnabled = vm.envOr("RUN_FORK", false);
        if (!forkEnabled) {
            emit log("RUN_FORK not set -> fork tests skipped (offline MockAqua path covers behaviour)");
            return;
        }
        string memory rpc = vm.envOr("FORK_RPC", string("https://ethereum-rpc.publicnode.com"));
        vm.createSelectFork(rpc);

        // Sanity: Aqua must actually be deployed at the fork block.
        require(AQUA.code.length > 0, "Aqua not deployed on this fork");

        pool = new BlessingPool(aqua, authorizer);

        // Fund the treasury (maker). Tokens stay in the pool's wallet.
        deal(WETH, address(pool), AMT0);
        deal(DAI, address(pool), AMT1);
    }

    modifier onlyFork() {
        if (!forkEnabled) return;
        _;
    }

    function _bless() internal returns (bytes32) {
        vm.prank(authorizer);
        return pool.bless(agent, WETH, DAI, AMT0, AMT1, SALT);
    }

    function test_fork_ship_opens_position() public onlyFork {
        bytes32 h = _bless();

        (uint248 raw0, uint8 tc0) = aqua.rawBalances(address(pool), address(pool), h, WETH);
        (uint248 raw1, uint8 tc1) = aqua.rawBalances(address(pool), address(pool), h, DAI);
        assertEq(raw0, AMT0, "raw0");
        assertEq(raw1, AMT1, "raw1");
        assertEq(tc0, 2, "tokensCount0");
        assertEq(tc1, 2, "tokensCount1");

        (uint256 b0, uint256 b1) = aqua.safeBalances(address(pool), address(pool), h, WETH, DAI);
        assertEq(b0, AMT0, "safe0");
        assertEq(b1, AMT1, "safe1");

        assertEq(IERC20(WETH).balanceOf(address(pool)), AMT0, "weth stays in maker");
        assertEq(IERC20(DAI).balanceOf(address(pool)), AMT1, "dai stays in maker");
    }

    function test_fork_dock_releases_balance() public onlyFork {
        bytes32 h = _bless();

        vm.prank(authorizer);
        pool.revoke(h);

        (uint248 raw0, uint8 tc0) = aqua.rawBalances(address(pool), address(pool), h, WETH);
        assertEq(raw0, 0, "raw0 zeroed");
        assertEq(tc0, 0xff, "docked0");

        vm.expectRevert(
            abi.encodeWithSelector(
                IAqua.SafeBalancesForTokenNotInActiveStrategy.selector, address(pool), address(pool), h, WETH
            )
        );
        aqua.safeBalances(address(pool), address(pool), h, WETH, DAI);
    }

    function test_fork_only_authorizer_can_dock() public onlyFork {
        bytes32 h = _bless();

        vm.prank(stranger);
        vm.expectRevert(BlessingPool.NotAuthorizer.selector);
        pool.revoke(h);

        vm.prank(stranger);
        vm.expectRevert(BlessingPool.NotAuthorizer.selector);
        pool.bless(agent, WETH, DAI, AMT0, AMT1, keccak256("other"));
    }

    function test_fork_double_dock_reverts() public onlyFork {
        bytes32 h = _bless();

        vm.prank(authorizer);
        pool.revoke(h);

        vm.prank(authorizer);
        vm.expectRevert(abi.encodeWithSelector(BlessingPool.PositionNotActive.selector, h));
        pool.revoke(h);
    }

    function test_fork_wage_paid_then_blocked_after_revoke() public onlyFork {
        bytes32 h = _bless();

        uint256 wage = 2 ether; // WETH
        vm.prank(agent);
        pool.payWage(h, WETH, wage);

        assertEq(IERC20(WETH).balanceOf(agent), wage, "agent paid real WETH");
        assertEq(IERC20(WETH).balanceOf(address(pool)), AMT0 - wage, "treasury debited");
        (uint248 raw0,) = aqua.rawBalances(address(pool), address(pool), h, WETH);
        assertEq(raw0, AMT0 - wage, "virtual balance decremented");

        vm.prank(authorizer);
        pool.revoke(h);

        vm.prank(agent);
        vm.expectRevert(abi.encodeWithSelector(BlessingPool.PositionNotActive.selector, h));
        pool.payWage(h, WETH, wage);
    }
}
