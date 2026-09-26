// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title PoolGuard — one verified human, one capped share of an Aqua blessing pool
/// @author sysadmin (GLOBY squad, ETHGlobal Tokyo 2026)
/// @notice The personhood gate for the Agent Ohana × 1inch Aqua lane.
///
///         PROBLEM: a liquidity pool can be dominated by one whale, one bot
///         farm, or one sybil crowd wearing a thousand wallets.
///         ANSWER:  World ID proof-of-personhood. The backend attester verifies
///         a real World ID `id_token` (signature + issuer + audience), hashes
///         the stable subject (`subHash = keccak256(sub)`) — the raw identity
///         never touches the chain — and claims exactly ONE slot per human.
///
///         Each slot is a capped share (CAP_BPS of the pool). The same human
///         verifying twice maps to the same subHash → the claim is idempotent
///         by construction. A wallet with no World proof never reaches this
///         contract at all: the attester refuses to sign for it.
contract PoolGuard {
    /// @notice Backend key that saw and verified the World ID proof.
    address public immutable attester;
    /// @notice The Aqua strategy this guard protects (BlessingPool strategyHash).
    bytes32 public poolStrategy;
    /// @notice Max share of the pool one verified human may hold, in bps.
    uint16 public constant CAP_BPS = 100; // 1.00%

    struct Slot {
        uint64 claimedAt; // block timestamp of the claim
        uint32 index; // 1-based slot number
        uint16 capBps; // the cap this slot was granted
    }

    /// @notice subHash (keccak256 of the World ID subject) => slot.
    mapping(bytes32 => Slot) public slots;
    uint32 public slotCount;

    error NotAttester();
    error AlreadyClaimed(bytes32 subHash);

    event SlotClaimed(bytes32 indexed subHash, uint32 indexed index, uint16 capBps, uint64 at);
    event PoolStrategySet(bytes32 indexed strategyHash);

    modifier onlyAttester() {
        if (msg.sender != attester) revert NotAttester();
        _;
    }

    constructor(address _attester, bytes32 _poolStrategy) {
        attester = _attester;
        poolStrategy = _poolStrategy;
        emit PoolStrategySet(_poolStrategy);
    }

    /// @notice Claim the ONE slot a verified human is entitled to.
    /// @dev Reverts on double-claim; the attester reads hasSlot() first and
    ///      reports the existing slot instead (idempotent UX, honest chain).
    function claimSlot(bytes32 subHash) external onlyAttester returns (uint32 index) {
        if (slots[subHash].claimedAt != 0) revert AlreadyClaimed(subHash);
        index = ++slotCount;
        slots[subHash] = Slot({claimedAt: uint64(block.timestamp), index: index, capBps: CAP_BPS});
        emit SlotClaimed(subHash, index, CAP_BPS, uint64(block.timestamp));
    }

    /// @notice One view for the frontend: does this human hold a slot, and which.
    function slotOf(bytes32 subHash)
        external
        view
        returns (bool claimed, uint32 index, uint16 capBps, uint64 claimedAt)
    {
        Slot memory s = slots[subHash];
        return (s.claimedAt != 0, s.index, s.capBps, s.claimedAt);
    }
}
