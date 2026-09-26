// SPDX-License-Identifier: CC0-1.0
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// The REAL 1inch Aqua registry contract (referenced via the pinned lib/aqua
// submodule, its own license applies) — the offline path runs against the exact
// same code that is deployed at 0x1111113CCf…, not a hand-rolled mock.
import {Aqua} from "aqua/src/Aqua.sol";
import {IAqua} from "aqua/src/interfaces/IAqua.sol";

import {BlessingSwap} from "../src/BlessingSwap.sol";
import {HonestTaker, MaliciousTaker} from "./Takers.sol";

/// @dev Minimal OZ-based mintable token, mirroring the upstream XYCSwap test.
contract TestToken is ERC20 {
    constructor(string memory n, string memory s) ERC20(n, s) {}
    function mint(address to, uint256 amt) external {
        _mint(to, amt);
    }
}

/// @title BlessingSwap offline test — real Aqua.sol, full ceremony beat chain.
contract BlessingSwapLocalTest is Test {
    Aqua internal aqua;
    BlessingSwap internal pool;
    TestToken internal weth;
    TestToken internal usdc;

    address internal authorizer = address(0xA11CE);
    address internal steward = address(0x57E1A5D); // the blessed agent
    address internal stranger = address(0xBAD);
    address internal takerRecipient = address(0x70);

    uint256 internal constant GIFT_WETH = 50 ether;
    uint256 internal constant GIFT_USDC = 100_000e6;
    uint256 internal constant FEE_BPS = 30; // 0.30%
    bytes32 internal constant BLESSING_ID = keccak256("trace.myagentohana.eth#nonce-1");

    HonestTaker internal taker;

    function setUp() public {
        aqua = new Aqua();
        pool = new BlessingSwap(IAqua(address(aqua)), authorizer);
        weth = new TestToken("Wrapped Ether", "WETH");
        usdc = new TestToken("USD Coin", "USDC");

        // The gift lives in the pool (the maker/treasury).
        weth.mint(address(pool), GIFT_WETH);
        usdc.mint(address(pool), GIFT_USDC);

        // A taker with its own inventory + approval to pay via aqua.push.
        taker = new HonestTaker(IAqua(address(aqua)));
        weth.mint(address(taker), 10 ether);
        usdc.mint(address(taker), 50_000e6);
    }

    function _strategy(bytes32 salt) internal view returns (BlessingSwap.Strategy memory s) {
        s = BlessingSwap.Strategy({
            maker: address(pool),
            token0: address(weth),
            token1: address(usdc),
            feeBps: FEE_BPS,
            steward: steward,
            blessingId: BLESSING_ID,
            salt: salt
        });
    }

    function _bless(BlessingSwap.Strategy memory s) internal returns (bytes32 h) {
        vm.prank(authorizer);
        h = pool.bless(s, GIFT_WETH, GIFT_USDC);
    }

    // ── BEAT 1: bless = ship. Opens the strategy; ZERO tokens move. ──────────────
    function test_bless_opens_strategy_zero_token_movement() public {
        BlessingSwap.Strategy memory s = _strategy(bytes32(uint256(1)));
        uint256 poolWethBefore = weth.balanceOf(address(pool));
        uint256 poolUsdcBefore = usdc.balanceOf(address(pool));

        bytes32 h = _bless(s);

        // Virtual balances recorded on Aqua…
        (uint256 b0, uint256 b1) = aqua.safeBalances(address(pool), address(pool), h, address(weth), address(usdc));
        assertEq(b0, GIFT_WETH, "weth virtual balance");
        assertEq(b1, GIFT_USDC, "usdc virtual balance");
        // …but the real ERC-20s never left the treasury. That is the magic.
        assertEq(weth.balanceOf(address(pool)), poolWethBefore, "no weth moved on bless");
        assertEq(usdc.balanceOf(address(pool)), poolUsdcBefore, "no usdc moved on bless");
        assertTrue(_active(h), "blessing active");
    }

    // ── BEAT 2: swapExactIn = the ONLY real token movement (flash-swap). ─────────
    function test_swap_moves_real_erc20() public {
        BlessingSwap.Strategy memory s = _strategy(bytes32(uint256(2)));
        bytes32 h = _bless(s);

        uint256 amountIn = 5 ether; // taker gives WETH (token0), receives USDC (token1)
        uint256 expOut = _quote(amountIn, GIFT_WETH, GIFT_USDC);

        uint256 recipUsdcBefore = usdc.balanceOf(takerRecipient);
        uint256 takerWethBefore = weth.balanceOf(address(taker));
        uint256 poolWethBefore = weth.balanceOf(address(pool));

        uint256 out = taker.swap(pool, s, true, amountIn, expOut, takerRecipient);
        assertEq(out, expOut, "amountOut = constant-product quote");

        // REAL transfers happened: recipient got USDC, taker paid WETH, pool net gained WETH.
        assertEq(usdc.balanceOf(takerRecipient), recipUsdcBefore + out, "recipient received USDC");
        assertEq(weth.balanceOf(address(taker)), takerWethBefore - amountIn, "taker paid WETH");
        assertEq(weth.balanceOf(address(pool)), poolWethBefore + amountIn, "pool received WETH");

        // Virtual balances tracked the swap.
        (uint256 vWeth, uint256 vUsdc) =
            aqua.safeBalances(address(pool), address(pool), h, address(weth), address(usdc));
        assertEq(vWeth, GIFT_WETH + amountIn, "virtual WETH up");
        assertEq(vUsdc, GIFT_USDC - out, "virtual USDC down");
    }

    // ── BEAT 3: steward re-ships (dock+ship) with a new fee — stewarding the gift. ─
    function test_steward_reship_reparameterizes() public {
        BlessingSwap.Strategy memory s = _strategy(bytes32(uint256(3)));
        bytes32 oldH = _bless(s);

        // Fresh struct (NOT `= s`, which would alias it in memory) — same steward
        // + blessingId, new fee and salt.
        BlessingSwap.Strategy memory s2 = _strategy(bytes32(uint256(3001)));
        s2.feeBps = 5; // steward tightens the spread to 0.05%

        vm.prank(steward);
        bytes32 newH = pool.reship(s, s2, GIFT_WETH, GIFT_USDC);

        assertFalse(_active(oldH), "old blessing docked");
        assertTrue(_active(newH), "new blessing active");
        // Old strategy is dead: safeBalances reverts.
        vm.expectRevert();
        aqua.safeBalances(address(pool), address(pool), oldH, address(weth), address(usdc));
        // New strategy is live and trades at the new fee.
        uint256 out = taker.swap(pool, s2, true, 5 ether, 0, takerRecipient);
        assertEq(out, _quote(5 ether, GIFT_WETH, GIFT_USDC, 5), "new-fee quote honored");
    }

    // ── BEAT 4: revoke = dock. Instant halt; the next swap reverts. ──────────────
    function test_revoke_kills_next_swap() public {
        BlessingSwap.Strategy memory s = _strategy(bytes32(uint256(4)));
        bytes32 h = _bless(s);

        // A swap works before revoke.
        taker.swap(pool, s, true, 1 ether, 0, takerRecipient);

        vm.prank(authorizer);
        pool.revoke(s);
        assertFalse(_active(h), "blessing docked");

        // Post-revoke: safeBalances reverts, so swapExactIn reverts. Gift is dead.
        vm.expectRevert();
        taker.swap(pool, s, true, 1 ether, 0, takerRecipient);
    }

    // ── access control + safety ─────────────────────────────────────────────────
    function test_only_authorizer_can_bless() public {
        BlessingSwap.Strategy memory s = _strategy(bytes32(uint256(5)));
        vm.prank(stranger);
        vm.expectRevert(BlessingSwap.NotAuthorizer.selector);
        pool.bless(s, GIFT_WETH, GIFT_USDC);
    }

    function test_only_authorizer_can_revoke() public {
        BlessingSwap.Strategy memory s = _strategy(bytes32(uint256(6)));
        _bless(s);
        vm.prank(stranger);
        vm.expectRevert(BlessingSwap.NotAuthorizer.selector);
        pool.revoke(s);
    }

    function test_reship_requires_steward_or_authorizer() public {
        BlessingSwap.Strategy memory s = _strategy(bytes32(uint256(7)));
        _bless(s);
        BlessingSwap.Strategy memory s2 = _strategy(bytes32(uint256(7001)));
        vm.prank(stranger);
        vm.expectRevert(BlessingSwap.NotStewardOrAuthorizer.selector);
        pool.reship(s, s2, GIFT_WETH, GIFT_USDC);
    }

    function test_reship_cannot_reassign_blessing() public {
        BlessingSwap.Strategy memory s = _strategy(bytes32(uint256(8)));
        _bless(s);
        BlessingSwap.Strategy memory s2 = _strategy(bytes32(uint256(8001)));
        s2.steward = stranger; // steward tries to hand the gift to someone else
        vm.prank(steward);
        vm.expectRevert(BlessingSwap.ReshipMustKeepBlessing.selector);
        pool.reship(s, s2, GIFT_WETH, GIFT_USDC);
    }

    function test_swap_respects_min_out() public {
        BlessingSwap.Strategy memory s = _strategy(bytes32(uint256(9)));
        _bless(s);
        uint256 expOut = _quote(5 ether, GIFT_WETH, GIFT_USDC);
        vm.expectRevert(
            abi.encodeWithSelector(BlessingSwap.InsufficientOutputAmount.selector, expOut, expOut + 1)
        );
        taker.swap(pool, s, true, 5 ether, expOut + 1, takerRecipient);
    }

    function test_malicious_taker_cannot_steal() public {
        BlessingSwap.Strategy memory s = _strategy(bytes32(uint256(10)));
        _bless(s);
        MaliciousTaker bad = new MaliciousTaker();
        vm.expectRevert(); // AquaApp.MissingTakerAquaPush — swap reverts, maker unharmed
        bad.swap(pool, s, true, 5 ether, address(bad));
    }

    function test_double_bless_reverts() public {
        BlessingSwap.Strategy memory s = _strategy(bytes32(uint256(11)));
        bytes32 h = _bless(s);
        vm.prank(authorizer);
        vm.expectRevert(abi.encodeWithSelector(BlessingSwap.BlessingAlreadyActive.selector, h));
        pool.bless(s, GIFT_WETH, GIFT_USDC);
    }

    function test_double_revoke_reverts() public {
        BlessingSwap.Strategy memory s = _strategy(bytes32(uint256(12)));
        bytes32 h = _bless(s);
        vm.prank(authorizer);
        pool.revoke(s);
        vm.prank(authorizer);
        vm.expectRevert(abi.encodeWithSelector(BlessingSwap.BlessingNotActive.selector, h));
        pool.revoke(s);
    }

    // ── helpers ──────────────────────────────────────────────────────────────────
    function _active(bytes32 h) internal view returns (bool active) {
        (, , active) = pool.blessings(h);
    }
    function _quote(uint256 amountIn, uint256 balIn, uint256 balOut) internal pure returns (uint256) {
        return _quote(amountIn, balIn, balOut, FEE_BPS);
    }
    function _quote(uint256 amountIn, uint256 balIn, uint256 balOut, uint256 fee) internal pure returns (uint256) {
        uint256 amountInWithFee = (amountIn * (10_000 - fee)) / 10_000;
        return (amountInWithFee * balOut) / (balIn + amountInWithFee);
    }
}
