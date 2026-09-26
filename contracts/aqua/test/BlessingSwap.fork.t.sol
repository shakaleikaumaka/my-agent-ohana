// SPDX-License-Identifier: CC0-1.0
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {IAqua} from "aqua/src/interfaces/IAqua.sol";
import {AquaApp} from "aqua/src/AquaApp.sol";
import {BlessingSwap} from "../src/BlessingSwap.sol";
import {HonestTaker, MaliciousTaker} from "./Takers.sol";

/// @title BlessingSwap — AUTHENTIC mainnet-fork test (SwapVM-native depth)
/// @notice Runs the full Blessing ceremony as a REAL 1inch Aqua application against
///         the deterministically-deployed Aqua registry at
///         0x1111113CCf1426A8E30e2bfF5E005d929bF6a90a on a mainnet fork. The
///         BlessingSwap app is simultaneously the maker (custodies the gift, funded
///         via the `deal` cheatcode), the app, and the authorizer gate. A real
///         HonestTaker settles the flash-swap by pushing input tokens back — so
///         genuine WETH/DAI move on-chain, not virtual accounting alone.
///
///         GATING: forks only when RUN_FORK=1. Plain `forge test` skips (each test
///         returns early and passes), keeping the offline path network-free.
///           RUN_FORK=1 forge test --match-path test/BlessingSwap.fork.t.sol -vv
///           RUN_FORK=1 FORK_RPC=https://rpc.ankr.com/eth forge test --match-path test/BlessingSwap.fork.t.sol -vv
contract BlessingSwapForkTest is Test {
    address internal constant AQUA = 0x1111113CCf1426A8E30e2bfF5E005d929bF6a90a;
    address internal constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address internal constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;

    IAqua internal aqua = IAqua(AQUA);
    BlessingSwap internal pool;
    HonestTaker internal taker;

    address internal authorizer = makeAddr("authorizer");
    address internal steward = makeAddr("steward");
    address internal stranger = makeAddr("stranger");
    address internal recipient = makeAddr("recipient");

    uint256 internal constant GIFT_WETH = 5 ether;
    uint256 internal constant GIFT_DAI = 10_000 ether; // DAI has 18 decimals
    uint256 internal constant FEE_BPS = 30;
    bytes32 internal constant BLESSING_ID = keccak256("trace.myagentohana.eth#fork");

    bool internal forkEnabled;

    function setUp() public {
        forkEnabled = vm.envOr("RUN_FORK", false);
        if (!forkEnabled) {
            emit log("RUN_FORK not set -> BlessingSwap fork tests skipped (offline real-Aqua.sol path covers behaviour)");
            return;
        }
        string memory rpc = vm.envOr("FORK_RPC", string("https://ethereum-rpc.publicnode.com"));
        vm.createSelectFork(rpc);
        require(AQUA.code.length > 0, "Aqua not deployed on this fork");

        pool = new BlessingSwap(aqua, authorizer);
        taker = new HonestTaker(aqua);

        // Fund the treasury (maker) and the taker with real tokens (deal-friendly).
        deal(WETH, address(pool), GIFT_WETH);
        deal(DAI, address(pool), GIFT_DAI);
        deal(WETH, address(taker), 5 ether);
        deal(DAI, address(taker), 20_000 ether);
    }

    modifier onlyFork() {
        if (!forkEnabled) return;
        _;
    }

    function _strategy(bytes32 salt) internal view returns (BlessingSwap.Strategy memory s) {
        s = BlessingSwap.Strategy({
            maker: address(pool),
            token0: WETH,
            token1: DAI,
            feeBps: FEE_BPS,
            steward: steward,
            blessingId: BLESSING_ID,
            salt: salt
        });
    }

    function _bless(BlessingSwap.Strategy memory s) internal returns (bytes32 h) {
        vm.prank(authorizer);
        h = pool.bless(s, GIFT_WETH, GIFT_DAI);
    }

    function _quote(uint256 amtIn, uint256 balIn, uint256 balOut, uint256 fee) internal pure returns (uint256) {
        uint256 amtInWithFee = (amtIn * (10_000 - fee)) / 10_000;
        return (amtInWithFee * balOut) / (balIn + amtInWithFee);
    }

    // ── bless opens a REAL strategy on the live registry; no tokens move ─────────
    function test_fork_bless_opens_on_real_registry() public onlyFork {
        BlessingSwap.Strategy memory s = _strategy(keccak256("f1"));
        bytes32 h = _bless(s);

        (uint256 b0, uint256 b1) = aqua.safeBalances(address(pool), address(pool), h, WETH, DAI);
        assertEq(b0, GIFT_WETH, "virtual WETH");
        assertEq(b1, GIFT_DAI, "virtual DAI");
        // Real ERC-20s untouched — the gift is live but nothing left the treasury.
        assertEq(IERC20(WETH).balanceOf(address(pool)), GIFT_WETH, "weth stays");
        assertEq(IERC20(DAI).balanceOf(address(pool)), GIFT_DAI, "dai stays");
    }

    // ── the swap moves real WETH/DAI on the fork (onchain execution) ─────────────
    function test_fork_swap_moves_real_erc20() public onlyFork {
        BlessingSwap.Strategy memory s = _strategy(keccak256("f2"));
        bytes32 h = _bless(s);

        uint256 amountIn = 1 ether; // give WETH, receive DAI
        uint256 expOut = _quote(amountIn, GIFT_WETH, GIFT_DAI, FEE_BPS);

        uint256 recipDaiBefore = IERC20(DAI).balanceOf(recipient);
        uint256 takerWethBefore = IERC20(WETH).balanceOf(address(taker));
        uint256 poolWethBefore = IERC20(WETH).balanceOf(address(pool));
        uint256 poolDaiBefore = IERC20(DAI).balanceOf(address(pool));

        uint256 out = taker.swap(pool, s, true, amountIn, expOut, recipient);
        assertEq(out, expOut, "amountOut matches constant-product quote");

        // REAL transfers settled on the fork:
        assertEq(IERC20(DAI).balanceOf(recipient), recipDaiBefore + out, "recipient got real DAI");
        assertEq(IERC20(WETH).balanceOf(address(taker)), takerWethBefore - amountIn, "taker paid real WETH");
        assertEq(IERC20(WETH).balanceOf(address(pool)), poolWethBefore + amountIn, "pool received real WETH");
        assertEq(IERC20(DAI).balanceOf(address(pool)), poolDaiBefore - out, "pool released real DAI");

        (uint256 vWeth, uint256 vDai) = aqua.safeBalances(address(pool), address(pool), h, WETH, DAI);
        assertEq(vWeth, GIFT_WETH + amountIn, "virtual WETH up");
        assertEq(vDai, GIFT_DAI - out, "virtual DAI down");
    }

    // ── steward re-ships (dock+ship) at a new fee; new strategy trades ───────────
    function test_fork_steward_reship() public onlyFork {
        BlessingSwap.Strategy memory s = _strategy(keccak256("f3"));
        bytes32 oldH = _bless(s);

        BlessingSwap.Strategy memory s2 = _strategy(keccak256("f3-v2"));
        s2.feeBps = 5;

        vm.prank(steward);
        bytes32 newH = pool.reship(s, s2, GIFT_WETH, GIFT_DAI);

        // old dead, new alive
        vm.expectRevert();
        aqua.safeBalances(address(pool), address(pool), oldH, WETH, DAI);
        (uint256 b0,) = aqua.safeBalances(address(pool), address(pool), newH, WETH, DAI);
        assertEq(b0, GIFT_WETH, "new strategy funded");

        uint256 out = taker.swap(pool, s2, true, 1 ether, 0, recipient);
        assertEq(out, _quote(1 ether, GIFT_WETH, GIFT_DAI, 5), "trades at new fee");
    }

    // ── revoke = dock; the next swap reverts on the live registry ────────────────
    function test_fork_revoke_kills_next_swap() public onlyFork {
        BlessingSwap.Strategy memory s = _strategy(keccak256("f4"));
        bytes32 h = _bless(s);

        taker.swap(pool, s, true, 0.5 ether, 0, recipient); // works before

        vm.prank(authorizer);
        pool.revoke(s);

        // safeBalances reverts post-dock, so swapExactIn reverts.
        vm.expectRevert(
            abi.encodeWithSelector(
                IAqua.SafeBalancesForTokenNotInActiveStrategy.selector, address(pool), address(pool), h, WETH
            )
        );
        taker.swap(pool, s, true, 0.5 ether, 0, recipient);
    }

    // ── a cheating taker cannot drain the maker (flash-swap safety) ──────────────
    function test_fork_malicious_taker_reverts() public onlyFork {
        BlessingSwap.Strategy memory s = _strategy(keccak256("f5"));
        _bless(s);
        MaliciousTaker bad = new MaliciousTaker();
        uint256 poolDaiBefore = IERC20(DAI).balanceOf(address(pool));

        vm.expectRevert(); // AquaApp.MissingTakerAquaPush
        bad.swap(pool, s, true, 1 ether, address(bad));

        assertEq(IERC20(DAI).balanceOf(address(pool)), poolDaiBefore, "no DAI leaked");
    }

    // ── access control holds on the live registry ────────────────────────────────
    function test_fork_only_authorizer_can_bless_and_revoke() public onlyFork {
        BlessingSwap.Strategy memory s = _strategy(keccak256("f6"));

        vm.prank(stranger);
        vm.expectRevert(BlessingSwap.NotAuthorizer.selector);
        pool.bless(s, GIFT_WETH, GIFT_DAI);

        _bless(s);
        vm.prank(stranger);
        vm.expectRevert(BlessingSwap.NotAuthorizer.selector);
        pool.revoke(s);
    }
}
