# Technology

What Aegis is built from, why each piece was chosen, and how the versions were
established.

---

## Why Midnight

Midnight is the only chain in the Cardano ecosystem whose programming model
makes *selective disclosure* the default rather than an add-on. Three properties
made it the right substrate for this problem:

**1. The compiler enforces the boundary.** In Compact, a private value cannot
reach public state without an explicit `disclose()`. A leak is a build error,
not a code-review miss. For health data that distinction is the entire product.

**2. Private state is genuinely local.** Witnesses are callbacks into state the
user holds. There is no encrypted-blob-on-chain that becomes readable when a key
leaks or an algorithm ages — the values were never transmitted.

**3. The public half stays public.** Trial criteria *should* be open; sponsors
lose nothing by publishing what they recruit for, and patients gain by being
able to read it without asking. A design that hid everything would be worse.

---

## The stack

Versions are pinned to what this repository was actually built and tested
against. Do not assume newer ones are compatible — see the drift note below.

| Component | Version | Role |
|---|---|---|
| Compact language | **0.23** | The ZK contract language |
| Compact compiler | **0.31.1** | Produces proving/verifying keys and the runtime JS |
| Compact developer tools | 0.5.1 | `compact` CLI |
| `@midnight-ntwrk/compact-runtime` | 0.16.0 | Executes compiled circuits |
| `@midnight-ntwrk/midnight-js-*` | 4.1.1 | Deploy, call, provider interfaces |
| `@midnight-ntwrk/dapp-connector-api` | 4.0.1 | Browser wallet integration |
| `@midnight-ntwrk/wallet-sdk` | 1.2.0 | Headless wallet for local scripts |
| Node.js | v24.19.0 (v22+ required) | Runtime |
| Proof server image | `midnightntwrk/proof-server:8.1.0` | Generates ZK proofs |
| Indexer image | `midnightntwrk/indexer-standalone:4.3.3` | Chain state and subscriptions |
| Node image | `midnightntwrk/midnight-node:1.0.0` | Local devnet chain |
| Vite | 8 (rolldown) | Frontend build |
| React | 19.2 | Interface |
| `motion` | 12 | Page and feed animation |

---

## How the versions were established

**Not from documentation.** The published Compact language reference described
v1.0 while the shipping compiler accepted only 0.23. Following the docs produces
a contract that will not build.

The versions above were determined by **probing the compiler directly** — writing
a file with a candidate `pragma language_version` and reading the error. That
process, and what each probe returned, is recorded in [VERSIONS.md](VERSIONS.md).

This is worth stating because it is the single most likely thing to waste a
newcomer's day.

---

## Traps worth knowing

Four things cost real debugging time on this project, none documented upstream.

### Duplicate WASM runtimes

`midnight-js-protocol` pins `ledger-v8` and `onchain-runtime-v3` to exact
versions while sibling packages use carets. A fresh install yields **two copies**
of each. Their classes have private fields, so cross-copy `instanceof` fails —
producing bogus `tsc` errors, then `expected instance of StateValue` at runtime.

Fixed with `resolutions` (yarn) and `overrides` (npm) in both `package.json`
files. Midnight's own starter escapes this only by accident of a stale committed
lockfile.

### The devnet startup race

The node reports healthy as soon as its RPC answers, which is *before* it has
authored block #1. The indexer needs that block and exits with
`Cannot construct OnlineClientAtBlock`. Fixed with `restart: on-failure`.

### SRS parameter fetches

The proof server downloads structured-reference-string material from
`srs.midnight.network` on first start, and **exits** rather than serving without
it. Those fetches fail intermittently. Worse, the material lives in the
container's writable layer, so `docker compose down` discarded a copy that had
succeeded.

Fixed by mounting `/.cache` as a named volume — later starts are then instant
and offline-capable.

### Tests that pass on any error

`rejects.toThrow()` passes on *any* thrown error, including the wiring faults
above. A real dependency bug once threw on exactly the paths a rejection test
covered, turning a broken test green.

Every rejection test now asserts against the **circuit's own assertion message**,
walking the error `cause` chain. See [TESTING.md](TESTING.md).

---

## Buildathon alignment

| Requirement | Where it is met |
|---|---|
| Compact contract that compiles | `contracts/aegis.compact`, compiler 0.31.1 |
| Private witness state with correct `disclose()` | 5 witnesses; 4 deliberate disclosures |
| Eligible **and** ineligible cases on devnet | 8 devnet tests, both directions |
| Frontend connected end-to-end | 7 pages streaming live ledger state |
| Private-vs-disclosed result screen | `/prove`, side-by-side panels |
| Apache-2.0 licence | [`LICENSE`](../LICENSE) |
| Ecosystem attribution | README, and below |

---

## Attribution

Built on [Midnight Network](https://midnight.network). The project structure,
wallet/provider harness and local devnet composition derive from Midnight's
official [`example-hello-world`](https://github.com/midnightntwrk/example-hello-world)
starter; the frontend was scaffolded from Midnight's official DApp template.
Uses the Compact language, the Compact toolchain, the Midnight proof server,
indexer and node images, and the Midnight DApp Connector API.
