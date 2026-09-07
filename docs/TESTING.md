# Testing

What is verified, how, and why the tests are shaped the way they are.

---

## Two suites

| Suite | Runs | Time | Covers |
|---|---|---|---|
| `src/test/simulator.test.ts` | In-process | ~0.2s | The circuit, via the same module the UI uses |
| `src/test/chain.test.ts` | In-process | ~0.1s | The read layer that turns ledger state into UI data |
| `src/test/aegis.test.ts` | Local devnet | ~134s | The same contract, deployed, with real proofs |

```bash
# fast loop — no devnet needed
npx vitest run src/test/simulator.test.ts src/test/chain.test.ts

# full run against a local devnet
yarn env:up && yarn test:local
```

**27 tests total.**

---

## What the devnet suite asserts

`aegis.test.ts` exercises both directions of the privacy claim against a real
deployed contract.

| Test | Asserts |
|---|---|
| deploys with empty public state | The ledger starts clean |
| publishes the sponsor's trial criteria publicly | Criteria are readable on chain |
| records issuer attestations as blinded commitments only | No health facts in attestations |
| **an ELIGIBLE patient proves eligibility** | A nullifier → `true` is the *only* thing written |
| **an INELIGIBLE patient is rejected** ×3 | Out-of-band age, excluded medication, wrong diagnosis |
| a replayed proof is rejected | Nullifier reuse is blocked |

The three rejection cases matter as much as the acceptance one. A system that
only demonstrates the happy path has not shown that its predicates do anything.

---

## Why rejection tests assert on messages

A bare `rejects.toThrow()` passes on **any** thrown error — including a
misconfigured provider, a duplicate WASM runtime, or a broken import. During
this project a real dependency bug threw on exactly the paths those tests
covered, which would have turned a broken system green.

Every rejection test now walks the error's `cause` chain and asserts the
**circuit's own assertion message** appears:

```ts
async function expectRejectionBecause(run, expectedReason) {
  let thrown;
  try { await run(); } catch (err) { thrown = err; }
  expect(thrown, 'expected the circuit to reject this patient').toBeDefined();
  expect(errorChainText(thrown)).toMatch(expectedReason);
}
```

So a passing rejection test means the *contract* refused, for the *stated
reason* — not that something, somewhere, failed.

---

## Why the fast suite uses real contract state

`chain.test.ts` feeds `decodeLedger` the `Ledger` object the circuit actually
produces, rather than a hand-built fixture:

```ts
const runtime = AegisRuntime.create(patient());
runtime.registerTrial(1n, CRITERIA);
runtime.attestPatientRecord(AegisRuntime.recordCommitment(ps));
runtime.checkTrialEligibility(1n);

const state = decodeLedger(runtime.publicLedger);
```

A fixture would keep passing after the contract's public shape changed; this
breaks, which is the point. A change to the ledger now fails a test instead of
quietly breaking the interface.

The suite also includes a blunt check that no health fact survives into
anything the UI can render — serialise the decoded state and assert the
patient's own values are absent.

---

## What the tests do *not* cover

Stated plainly, because unstated gaps are worse than known ones.

- **The browser wallet path.** The connector adapter, browser deploy and browser
  submit typecheck and build, but no live wallet has exercised them. See
  [DEPLOYMENT.md](DEPLOYMENT.md#why-there-is-no-public-testnet-deployment).
- **Public testnet behaviour.** All on-chain testing is against a local devnet.
- **The interface itself.** There are no component or end-to-end browser tests.
  The privacy-critical logic is covered because the UI calls the same tested
  module rather than reimplementing it, but rendering and interaction are
  verified by hand.
- **Cryptographic review.** The commitment and nullifier constructions are
  straightforward uses of the standard library, but nobody has reviewed them
  adversarially.

---

## Verifying the toolchain gate

The contract compiling is the buildathon's hard gate. To check it without
waiting for ZK key generation:

```bash
yarn compile:check   # compact compile --skip-zk
```

Full compilation, including proving and verifying keys:

```bash
yarn compile
```
