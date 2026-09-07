# Architecture

How Aegis is built, and where the privacy guarantee actually comes from.

---

## Midnight's dual-ledger model

Midnight splits contract state in two:

- **Private state** lives with the user. It is read inside a proof through
  *witnesses* — callbacks the circuit invokes but whose values never enter a
  transaction.
- **Public state** lives on chain, readable by anyone.

The crossing between them is a single language construct: `disclose()`. **The
Compact compiler refuses to build a circuit that moves a private value into
public state without one.**

This matters more than it first appears. The guarantee is not "we were careful
not to log the diagnosis". It is that a build which leaked it would not compile.
Privacy is a property the toolchain enforces, not a discipline the authors
maintain.

---

## The contract

`contracts/aegis.compact`, 134 lines, Compact language 0.23.

### Public ledger

```compact
export ledger checksPerformed: Counter;
export ledger trials: Map<Uint<32>, TrialCriteria>;
export ledger attestedRecords: Set<Bytes<32>>;
export ledger eligibilityResults: Map<Bytes<32>, Boolean>;
```

### Private witnesses

```compact
witness patientDiagnosis(): Uint<32>;
witness patientAge(): Uint<8>;
witness patientOnExcludedMedication(): Boolean;
witness patientRecordNonce(): Bytes<32>;
witness patientSecretKey(): Bytes<32>;
```

Implemented in `src/witnesses.ts`. Each returns `[nextPrivateState, value]`, and
Aegis never mutates private state — an eligibility check is a pure read of facts
the patient already holds.

### Circuits

| Circuit | Role | Discloses |
|---|---|---|
| `registerTrial` | Sponsor publishes criteria | Trial id and criteria — public by design |
| `attestPatientRecord` | Issuer vouches for a record | One 32-byte blinded commitment |
| `checkTrialEligibility` | Patient proves they qualify | A nullifier and `true` |
| `recordCommitment` | Pure — derives the commitment | *(callable off-chain)* |
| `trialNullifier` | Pure — derives the nullifier | *(callable off-chain)* |
| `ping` | The skeleton circuit that proved the toolchain before any real logic | — |

### The eligibility circuit, step by step

```compact
export circuit checkTrialEligibility(trialId: Uint<32>): [] {
  const criteria = trials.lookup(disclose(trialId));

  const diagnosis  = patientDiagnosis();
  const age        = patientAge();
  const onExcluded = patientOnExcludedMedication();
  const nonce      = patientRecordNonce();
  const secretKey  = patientSecretKey();

  // 1. You may only prove things a clinic actually attested.
  const commitment = recordCommitment(diagnosis, age, onExcluded, nonce);
  assert(attestedRecords.member(disclose(commitment)),
         "no issuer attestation for these facts");

  // 2. The trial's predicates.
  assert(diagnosis == criteria.conditionCode, "diagnosis does not match trial condition");
  assert(age >= criteria.minAge,              "patient is below the trial's minimum age");
  assert(age <= criteria.maxAge,              "patient is above the trial's maximum age");
  assert(!onExcluded, "patient takes a medication that excludes them from this trial");

  // 3. One check per patient per trial.
  const nullifier = trialNullifier(secretKey, trialId);
  assert(!eligibilityResults.member(disclose(nullifier)),
         "eligibility already proven for this trial");

  eligibilityResults.insert(disclose(nullifier), true);
  checksPerformed.increment(1);
}
```

Four `disclose()` calls, and every one is deliberate:

- `trialId` — the patient chose a public trial; hiding it would hide nothing.
- `commitment` — already blinded by a secret nonce.
- `nullifier` — derived from `(secret, trialId)`, so it is opaque, and it
  differs per trial, which is what stops a sponsor correlating a patient's
  checks across trials.
- The boolean result.

**If any assertion fails, the proof is unsatisfiable.** An ineligible patient
cannot produce a transaction — not one that gets rejected, but no transaction at
all.

---

## Data flow

```
┌──────────────────── patient's device ─────────────────────┐
│  private state              witnesses                     │
│  ├─ diagnosis        ──►  patientDiagnosis()              │
│  ├─ age              ──►  patientAge()                    │
│  ├─ medication flag  ──►  patientOnExcludedMedication()   │
│  ├─ record nonce     ──►  patientRecordNonce()            │
│  └─ secret key       ──►  patientSecretKey()              │
│                              │                            │
│                              ▼                            │
│                   ┌──────────────────────┐                │
│                   │ checkTrialEligibility│                │
│                   │  (Compact circuit)   │                │
│                   └──────────┬───────────┘                │
└──────────────────────────────┼────────────────────────────┘
                               │  disclose() — the ONLY crossing
                               ▼
┌──────────────────── public ledger ─────────────────────────┐
│  trials:             trialId → { condition, minAge, maxAge }│
│  attestedRecords:    { blinded commitments }                │
│  eligibilityResults: nullifier → true                       │
│  checksPerformed:    counter                                │
└─────────────────────────────────────────────────────────────┘
```

---

## The interface

Seven pages, sharing one rule with no exceptions: **private things are amber
and lock-marked, public things are blue and globe-marked.** Learn it once and
every screen is readable at a glance. It is the visual form of the dual-ledger
model.

| Route | Purpose |
|---|---|
| `/` | The problem, the trade, live ledger activity |
| `/how-it-works` | The model and the circuit, step by step |
| `/trials` | The public trial registry, read from chain |
| `/prove` | Three-step patient flow, private-vs-disclosed result |
| `/ledger` | Everything an observer can see — the adversary's view |
| `/registry` | Sponsor and issuer roles; browser deploy |
| `/get-started` | Onboarding and setup |

### The interface cannot disagree with the contract

The UI does **not** re-implement the eligibility rules in TypeScript. It calls
`src/simulator.ts`, which executes the *actual circuit* compiled from
`aegis.compact` — the same JavaScript the on-chain runtime runs, `assert`s
included. A screen showing "eligible" is showing the contract's own verdict.

That module is shared with the tests, so the privacy-critical path has no
browser-only copy that could drift.

### Where the numbers come from

Trials, attestations, results and the check counter are read from the deployed
contract through the Midnight indexer, over a websocket that pushes a new
snapshot on every change.

**Compact has no event log** — a circuit's only observable effect is the state it
leaves behind. So the activity feed is derived by *diffing consecutive ledger
snapshots* (`src/chain.ts`). That is a deliberate choice, not a shortcut: an
event log could in principle say more than the state does; a diff cannot. Every
row in the feed is something any observer could reconstruct from public data.

---

## Browser wallet integration

The interface can deploy the contract and submit eligibility proofs directly,
through the Midnight DApp Connector.

1. Private facts go into an **in-memory** store (`session-private-state.ts`).
   The Node scripts use LevelDB, which is right for a service that must survive
   a restart; for a patient it is the wrong default, because writing a diagnosis
   to disk creates the durable record Aegis exists to avoid.
2. The circuit runs, reading them through witnesses.
3. The **wallet proves the circuit** via `getProvingProvider` — no local proof
   server needed in the browser.
4. The wallet balances, seals and signs.
5. The wallet submits.

By step 4 there is nothing private left in the object being passed: the
witnesses were consumed inside the proof. **The wallet never sees a diagnosis.**

> A *remote* proof server does receive the circuit preimage, which contains
> witness values. For the patient flow, run the proof server locally. See
> [DEPLOYMENT.md](DEPLOYMENT.md#a-note-on-the-proof-server).

---

## Repository layout

```
contracts/aegis.compact     the contract — the technical gate
src/
  witnesses.ts              private inputs the circuit reads
  simulator.ts              runs the real circuit locally; shared with the UI
  chain.ts                  ledger decoding and snapshot diffing
  scenario.ts               deploy + seed + prove, as reusable steps
  providers.ts, wallet.ts   midnight-js provider wiring
  test/                     19 in-process tests, 8 devnet tests
scripts/                    local deploy, local patient runs, chain queries
ui/src/
  chain/                    providers, wallet connector, browser deploy/submit
  components/, pages/       the interface
```
