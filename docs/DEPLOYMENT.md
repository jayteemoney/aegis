# Deployment

How to run Aegis, and an honest account of what is and is not deployed.

---

## Status

| | |
|---|---|
| Contract | Compiles on Compact 0.23 / compiler 0.31.1 |
| Deployed | Local Midnight devnet — 3 trials, 4 attestations, 2 eligibility proofs |
| Proofs | Real ZK proofs, real transactions; eligible **and** ineligible cases |
| Interface | 7 pages, streaming live ledger state over the indexer websocket |
| Public testnet | **Not deployed** — see [below](#why-there-is-no-public-testnet-deployment) |

Wave 1's acceptance criterion is, verbatim: *"Frontend builds, runs, and
connects to the contract end-to-end (local devnet)."* That is met in full.

---

## Running it locally

The devnet's genesis account is pre-funded by the `dev` chain preset, so a local
deployment needs **no faucet and no DUST delegation**.

```bash
yarn install
yarn demo                              # compile, start devnet, deploy, seed
cd ui && npm install && npm run dev    # http://localhost:5173
```

`yarn demo` expands to `yarn compile && yarn env:up && yarn deploy:local`. Run
them separately if you would rather watch each step.

Then drive it:

```bash
yarn patient ada 1     # a real proof, a real transaction
yarn patient           # every patient × every trial
```

Leave the ledger page open while that runs — the nullifier arrives in the
activity feed within a block, with no reload. Patients who do not qualify are
refused by the circuit before a transaction is ever built, which is the privacy
property made visible: **there is no rejection to observe.**

> **The devnet keeps no persistent volume.** A `docker compose down`, Docker
> restart, or reboot resets the chain to genesis and the contract address in
> `deployments/local.json` stops existing. That is deliberate — a disposable
> chain is the point — but it means a committed address records a past run
> rather than promising anything about your machine. Re-run `yarn deploy:local`.
> If the ledger page is empty or erroring after `yarn env:up`, this is why.

### Useful commands

| Command | Does |
|---|---|
| `yarn compile` | Build the contract, republish ZK assets for the browser |
| `yarn compile:check` | Compile without ZK key generation (fast gate check) |
| `yarn env:up` / `env:down` | Local devnet up / down |
| `yarn proof:up` | Just the proof server |
| `yarn deploy:local` | Deploy and seed |
| `yarn patient [id] [trial]` | Prove eligibility on chain |
| `yarn utxos <network> <address>` | What the chain holds for an address, in seconds |
| `yarn test:local` | Full devnet suite |
| `yarn validate` | Compile, devnet up, test, tear down |

---

## Deploying to a public testnet

There is **no testnet deploy script**, and that is a deliberate consequence of
the finding below. Testnet deployment goes through a browser wallet, from the
**Operators** page in the interface.

1. Install a Midnight wallet extension; point it at your network.
2. Fund its **unshielded** address (`mn_addr_<network>1…`) from that network's
   faucet. The faucet dispenses NIGHT; the shielded and dust addresses are not
   fundable.
3. **Register that NIGHT for DUST generation**, in the wallet's own UI.
4. Connect the wallet in the interface, then deploy from `/registry`.

It runs eight transactions — the deployment, three trial registrations, four
attestations — each approved in the wallet, with a live progress log. On success
it prints a deployment record to save as `deployments/<network>.json`. Reload,
and the interface picks it up.

> **tNIGHT alone is not enough.** Fees are paid in DUST, which only accrues from
> NIGHT you have explicitly registered. A wallet holding only tNIGHT fails at
> submission with an error that never mentions DUST. This is the most common way
> a first deploy dies.

The interface reads every record in `deployments/`, so local and testnet
deployments coexist. Switch with `VITE_NETWORK=preprod npm run dev`, or append
`?network=preprod` to any URL — no rebuild.

### A note on the proof server

**A remote proof server receives the circuit preimage, which for
`checkTrialEligibility` contains the patient's witness values.** For a project
whose claim is that health facts never leave the device, that matters.

- **Patient flow → local proof server.** `yarn proof:up`, then select
  `Local (http://localhost:6300)` in the wallet's Midnight settings.
- **Operator transactions → either is fine.** Deploying, registering trials and
  attesting commitments carry no private witness data; criteria are public and
  attestations are already blinded.

---

## Why there is no public testnet deployment

Not for want of trying. The reason is a platform constraint, and it is worth
recording precisely.

### Preview — unfundable

The faucet (`midnight-tmnight-preview.nethermind.dev`) returned **HTTP 503
continuously for two days**. A wallet there cannot be funded at all.

A second host, `faucet.preview.midnight.network`, answers but serves a different
network and rejects preview addresses with *"expected test address, got preview
one"* — so it is not a fallback.

### Preprod — fundable, unsyncable

Funding succeeded: 1000 tNIGHT, confirmed on chain. Syncing a wallet did not.
The chain is **2,443,457 blocks**, and the DUST index is the bottleneck.
Measured, not estimated:

| Wallet component | Sync progress |
|---|---|
| Unshielded | complete in ~1 minute |
| Shielded | complete in ~3 minutes |
| **DUST** | **19.5% after 4 hours** — sustained ~759 entries/min → **>24 hours** |

That cost also **recurs**. A wallet built through the testkit rescans from
genesis on every process, so deploying and then proving would pay it twice.

The wallet SDK does expose `DustWallet.restore(serializedState)`, so dust state
is persistable in principle — the testkit's `WalletSaveStateProvider` simply
does not cover it, accepting only shielded and unshielded wallets. That would
help on later runs, but not the first, and the first is the problem.

### The browser wallet hits the same wall

A browser wallet was the obvious escape: it keeps state across sessions and pays
the sync once, in the background. In practice Lace stalls at **50%** on preprod
— which is exactly what an aggregate progress bar looks like when two of three
components finish in minutes and the third does not.

### What this cost, and what it did not

The contract, the circuits, the disclosure boundary, the tests and the interface
are network-agnostic and all verified. What is missing is a public address to
point at.

**The deploy path is built and waiting.** No code changes when a testnet becomes
reachable: a `deployments/preprod.json` lands beside `deployments/local.json`
and the interface picks it up. The browser deploy has never met a live wallet,
so first contact will likely surface something — the two most likely spots are
the hex encoding across `balanceUnsealedTransaction`, and whether
`getProvingProvider` accepts the `asKeyMaterialProvider()` output unchanged.

### Checking a chain without a wallet

Because wallet sync is unreliable on long chains, `yarn utxos` asks the indexer
directly over a websocket subscription. It answers in seconds what the SDK route
needs a day for, and it separates two failures that look identical from inside a
wallet: funds that never arrived, and funds that arrived but are not displayed.

```bash
yarn utxos preprod mn_addr_preprod1…
```
