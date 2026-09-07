# Aegis

**Prove you qualify for a clinical trial — without revealing your diagnosis,
your age, or the medications you take.**

A privacy-preserving clinical-trial matching dApp built on
[Midnight](https://midnight.network) with zero-knowledge selective disclosure,
written in the Compact language. Built for the Midnight buildathon.

---

## The problem, in one line

Clinical-trial screening makes you disclose your medical history to ask a
question about it — and most people who ask are told *no*, after the data has
already been surrendered.

**The sponsor needs one bit. They receive a dossier.**

Aegis replaces the disclosure with a proof. Your health facts stay on your
device; the ledger records a nullifier and `true`. If you do not qualify, the
proof is unsatisfiable and **no transaction exists at all** — there is not even
a rejection to leak.

---

## Status

| | |
|---|---|
| Contract | Compiles on Compact 0.23 / compiler 0.31.1 |
| Deployed | Local Midnight devnet — 3 trials, 4 attestations, 2 eligibility proofs |
| Proofs | Real ZK proofs, real transactions; eligible **and** ineligible cases |
| Interface | 7 pages, streaming live ledger state over the indexer websocket |
| Tests | 27 — 19 in-process (<1s), 8 on devnet (~134s) |
| Public testnet | **Not deployed** — a platform constraint, [documented in full](docs/DEPLOYMENT.md#why-there-is-no-public-testnet-deployment) |

Wave 1's acceptance criterion — *"Frontend builds, runs, and connects to the
contract end-to-end (local devnet)"* — is met in full.

---

## Run it

The local devnet's genesis account is pre-funded, so this needs no faucet and no
wallet:

```bash
yarn install
yarn demo                              # compile, start devnet, deploy, seed
cd ui && npm install && npm run dev    # http://localhost:5173
```

Then, with the ledger page open in another tab:

```bash
yarn patient ada 1     # a real proof, a real transaction
```

The nullifier arrives in the activity feed within a block. Patients who do not
qualify are refused by the circuit before a transaction is built — the privacy
property, made visible.

Full instructions, including public-testnet deployment through a browser
wallet: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

---

## Documentation

| Document | What it covers |
|---|---|
| **[OVERVIEW.md](docs/OVERVIEW.md)** | What the product is, the gap it addresses, and the approach |
| **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** | The circuit, the dual-ledger model, the disclosure boundary, the interface |
| **[TECHNOLOGY.md](docs/TECHNOLOGY.md)** | The Midnight stack, pinned versions, and four traps that cost real time |
| **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** | Running it, and the public-testnet finding with measurements |
| **[SUSTAINABILITY.md](docs/SUSTAINABILITY.md)** | Whether this survives over time and across jurisdictions |
| **[TESTING.md](docs/TESTING.md)** | What is verified, how, and what is not |
| [SETUP.md](docs/SETUP.md) | Toolchain installation from a clean machine |
| [VERSIONS.md](docs/VERSIONS.md) | How the versions were established, and documentation drift |

---

## What makes it more than a demo

**The compiler enforces the privacy, not the authors.** In Compact a private
value cannot reach public state without an explicit `disclose()`. A leak is a
build error. The contract makes four disclosures and every one is deliberate.

**The interface cannot disagree with the contract.** The UI does not
reimplement the eligibility rules in TypeScript — it executes the *actual
compiled circuit*, the same JavaScript the chain runs, assertions included.

**The activity feed claims nothing the chain does not say.** Compact has no
event log, so the feed is derived by diffing consecutive ledger snapshots. Every
row is something any observer could reconstruct from public data.

**Ineligibility leaves no trace.** Not a rejection record — no transaction.

---

## Known limitations

Stated plainly; the roadmap in
[SUSTAINABILITY.md](docs/SUSTAINABILITY.md#what-would-have-to-be-true) is how
they get fixed.

- Issuer attestation is a hash match against a public `Set`, not a signature.
- Proving eligibility discloses *which* attested commitment was used, so the
  issuer could link a check to a patient. The health facts stay private
  regardless.
- Single-issuer, single-criteria-shape trials.
- The browser wallet path builds and typechecks but has never met a live wallet.

---

## Attribution

Built on [Midnight Network](https://midnight.network). Project structure,
wallet/provider harness and devnet composition derive from Midnight's official
[`example-hello-world`](https://github.com/midnightntwrk/example-hello-world)
starter; the frontend was scaffolded from Midnight's official DApp template.

## Licence

[Apache-2.0](LICENSE)
