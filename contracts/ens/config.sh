# shellcheck shell=bash
# ─────────────────────────────────────────────────────────────────────────────
# config.sh — single source of truth for the ENSv2 + EAC lane (M5-4)
# Keeper: Globy Mahalo 🌊 · every script sources this.
# ONE edit here re-points the whole ceremony (parent name, RPC, authorizer).
# NO PRIVATE KEYS IN THIS FILE — keys come from env / the keys file (see README).
# ─────────────────────────────────────────────────────────────────────────────

# ── PARENT NAME (rename = ONE edit) ──────────────────────────────────────────
# Recommendation pending sysadmin/Shaka ratify: myagentohana.eth
# (Kaaak's shell placeholder is ohana.eth — reconcile once ratified; build here.)
PARENT_LABEL="${PARENT_LABEL:-myagentohana}"     # the .eth label we register
PARENT_TLD="${PARENT_TLD:-eth}"
PARENT_NAME="${PARENT_LABEL}.${PARENT_TLD}"

# ── The 6 agent subnames (order canonical, from Shaka 21:05 CAST v2) ──────────
# pit · shaka · terri · trace · spector · crops → e.g. trace.myagentohana.eth
AGENTS_JSON="${AGENTS_JSON:-$(dirname "${BASH_SOURCE[0]}")/agents.config.json}"

# ── RPC (override with ENS_RPC / anvil fork sets it to local) ─────────────────
# Primary + fallbacks are pre-flighted in backup-rpcs.md. See lib.sh rpc_pick().
ENS_RPC="${ENS_RPC:-https://ethereum-sepolia-rpc.publicnode.com}"
ENS_RPC_FALLBACK_1="${ENS_RPC_FALLBACK_1:-https://sepolia.gateway.tenderly.co}"
ENS_RPC_FALLBACK_2="${ENS_RPC_FALLBACK_2:-https://1rpc.io/sepolia}"
CHAIN_ID="${CHAIN_ID:-11155111}"                 # Sepolia (ENSv2's home)

# ── ENSv2 Beta Sepolia addresses (2026-09-15 deploy; live-verified on-chain) ──
# Source: docs.ens.domains/learn/deployments → contracts-v2 @ 71a3b733.
# RE-VERIFY with 00-preflight.sh before every session (ENS re-deploys the beta).
ETH_REGISTRY="0x657ea849311d3d5823348dded7c2aaafb3ede09e"   # parent .eth lives here
ETH_REGISTRAR="0xabe76f6c8dfced81aa5a2bb8034202a7136b94ca"  # commit-reveal register
ROOT_REGISTRY="0x9703dbd26dab89504490994138cf2c575251a9ce"
RENT_ORACLE="0x9b0b9c65bdaf9794ff7697e4dcfb1f50581072bb"
VERIFIABLE_FACTORY="0x9e726eb570beb6bceb495ab8cda7df517d4e841c"  # deploy our proxies
USER_REGISTRY_IMPL="0xa80338aaa8d23831cea25e858d1774534abb0263" # impl for our subname registry
PERM_RESOLVER_IMPL="0x14f09fd05d4585759e54844dc9b00147131cf243" # impl for our per-project resolver
PUBLIC_RESOLVER_V2="0xd7e590ad0e92a6ac1d81f4483a9b951d3585a50f" # v1-bridge resolver — NOT used (see README scar)
UNIVERSAL_RESOLVER="0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe" # stock viem ENS reads work
UNIVERSAL_HELPER="0x33f571aa8a160a21b877cf6e0fb8806692b97df5"
MOCK_USDC="0x16f95d91dba7da3aca778ec053df0ff6c6a8aa8e"          # parent .eth payment (mint() is open)

# ── WALLETS ──────────────────────────────────────────────────────────────────
# AUTHORIZER = the blessing authority: owns the parent name, deploys our
# registry+resolver, holds ALL root roles → the ONLY account that can bless/revoke.
# Default = agent-born rehearsal 'deployer' (funded 2026-09-25 signing session, ~0.6 SepETH).
# On a fork this is overridden to anvil's fresh EOA. NEVER Shaka's real key here.
AUTHORIZER="${AUTHORIZER:-0x1296597106008db4273588aDa45b1e9963Ae05E7}"
# AUTHORIZER_PK is read from env only (export before running writes) — never stored here.

# ── ENSIP-25 agent registry (the on-chain "who to attest against") ────────────
# Disclosed base AgentLaunchRegistry on Sepolia (PRIOR-WORK-DECLARATION.md).
AGENT_REGISTRY_ADDR="${AGENT_REGISTRY_ADDR:-0x62412fcA6437b914EDD87b85455682Ec73968347}"
AGENT_REGISTRY_CHAINID="${AGENT_REGISTRY_CHAINID:-11155111}"

# ── EAC role bit constants (Permissioned Registry — RegistryRolesLib, verified) ─
ROLE_REGISTRAR="0x1"            # 1<<0   register/reserve (root)
ROLE_UNREGISTER="0x1000"        # 1<<12  delete a name (root or name) — hard revoke lever
ROLE_RENEW="0x10000"            # 1<<16  extend expiry
ROLE_SET_SUBREGISTRY="0x100000" # 1<<20
ROLE_SET_RESOLVER="0x1000000"   # 1<<24  change a name's resolver — our BLESS capability
# admin variant of any role = role << 128 (register-time only on a name)
ALL_ROLES="0x1111111111111111111111111111111111111111111111111111111111111111"

# ── Resolver role bits (PermissionedResolverLib — verified) ───────────────────
RES_ROLE_SET_ADDRESS="0x1"      # 1<<0
RES_ROLE_SET_TEXT="0x10"        # 1<<4

# ── Blessing policy ──────────────────────────────────────────────────────────
# What capability a "blessing" grants the agent on its own subname.
# Soft-revoke headline: revoke this and the agent can no longer re-point its name.
BLESS_ROLES="${BLESS_ROLES:-$ROLE_SET_RESOLVER}"
# Subname lifetime (seconds). Expiry is an ABSOLUTE unix ts at register() time.
SUBNAME_TTL="${SUBNAME_TTL:-31536000}"   # 1 year default (demo can use 604800 = 7d)
PARENT_DURATION="${PARENT_DURATION:-31536000}"  # 1 year parent registration

# ── State file (deployed addresses persist between numbered steps) ─────────────
STATE_FILE="${STATE_FILE:-$(dirname "${BASH_SOURCE[0]}")/deployed.env}"
