// Human label for a canister, resolved from its on-chain canister ID.
//
// The proposal's target canister ID comes straight from the on-chain proposal
// payload (install_code.canister_id, see nns.ts). We then look up its name from
// the IC dashboard's canister-metadata endpoint — DFINITY's canonical registry
// of canister identities, keyed by the real canister ID rather than guessed
// from the proposal title (which calls everything an "NNS Canister"). A small
// well-known map covers the core system canisters if the API is unavailable.
//
// e.g. uf6dk-hyaaa-aaaaq-qaaaq-cai → "Exchange Rate" (not "NNS").

const WELL_KNOWN: Record<string, string> = {
  "rwlgt-iiaaa-aaaaa-aaaaa-cai": "Registry",
  "rrkah-fqaaa-aaaaa-aaaaq-cai": "Governance",
  "ryjl3-tyaaa-aaaaa-aaaba-cai": "ICP Ledger",
  "qoctq-giaaa-aaaaa-aaaea-cai": "NNS Dapp",
  "rdmx6-jaaaa-aaaaa-aaadq-cai": "Internet Identity",
  "qaa6y-5yaaa-aaaaa-aaafa-cai": "Cycles Minting",
  "uf6dk-hyaaa-aaaaq-qaaaq-cai": "Exchange Rate",
};

/**
 * Resolve a canister's display name from its ID. Returns null when the ID is
 * unknown to both the dashboard and the well-known map.
 */
export async function getCanisterLabel(canisterId: string | null): Promise<string | null> {
  if (!canisterId) return null;
  try {
    const res = await fetch(
      `https://ic-api.internetcomputer.org/api/v3/canisters/${canisterId}`,
      { next: { revalidate: 86400 } } // canister names are effectively static
    );
    if (res.ok) {
      const data = await res.json();
      const name = String(data?.name ?? "").trim();
      if (name) return name;
    }
  } catch {
    // fall through to the well-known map
  }
  return WELL_KNOWN[canisterId] ?? null;
}
