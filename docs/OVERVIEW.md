# Aegis — what it is, and why

> Prove you qualify for a clinical trial without revealing your diagnosis, your
> age, or the medications you take.

Aegis is a privacy-preserving clinical-trial matching dApp built on
[Midnight](https://midnight.network), written in the Compact language. It was
built for the Midnight buildathon.

---

## The gap

Clinical-trial recruitment has a structural flaw that nobody designed and
everybody tolerates: **you must disclose your medical history in order to ask a
question about it.**

To find out whether you qualify for a trial, you submit a diagnosis code, a date
of birth, a medication list — often an entire record — to a sponsor's screening
portal. Then one of two things happens:

- **You do not qualify.** This is the common outcome. Screening funnels are
  wide by design; most people who enter one are filtered out. Your data was
  surrendered to answer a question whose answer was *no*, and it does not come
  back. It sits in a system you do not control, governed by a retention policy
  you did not read, exposed to a breach you will hear about years later.
- **You qualify.** Your data is now held by a sponsor who legitimately needs it
  — but they also hold the records of everyone who did not qualify, which they
  never needed at all.

The asymmetry is the whole problem. **The sponsor needs one bit of information —
eligible or not — and receives a dossier.**

### Why this is not solved by policy

Every existing mitigation is a promise about behaviour: consent forms, retention
schedules, access controls, de-identification, audit logs. Each is a control
that can be misconfigured, a policy that can change, a database that can be
breached, a company that can be acquired.

None of them change the fact that **the data was transmitted.** Once it has
moved, every protection is somebody's ongoing diligence rather than a property
of the system.

That is the gap Aegis addresses: not *how carefully is health data held*, but
*why was it sent at all*.

---

## The approach

Aegis replaces the disclosure with a **zero-knowledge proof**.

The patient's health facts stay on their device and enter a circuit as
*witnesses* — private inputs the proof consumes but never publishes. The circuit
checks them against the trial's published criteria and, if they satisfy it,
emits exactly two values to the public ledger:

1. A **nullifier** — an opaque 32-byte value derived from the patient's secret
   and the trial id.
2. The **result** — `true`.

That is the entire disclosure. No diagnosis. No age. No medication list. No
identity. And critically: **if the patient does not qualify, the proof is
unsatisfiable and no transaction is produced at all** — so there is not even a
rejection record to leak, sell, or subpoena.

### Why a zero-knowledge chain rather than a private server

A trusted server could do the matching without publishing anything. It would
also be a single party you must trust, with a database that becomes a target the
moment it exists.

Midnight's model removes the trusted party without removing the guarantee. The
*criteria* are public — sponsors gain nothing by hiding what they recruit for —
while the *facts* stay private, and the boundary between the two is enforced by
a compiler rather than by a policy. See [ARCHITECTURE.md](ARCHITECTURE.md) for
how that enforcement works.

---

## What stops a patient from lying?

The obvious objection: if the data never leaves your device, what stops you
claiming a diagnosis you do not have?

An **issuer attestation**. A clinic or EHR provider computes a commitment over
the patient's record plus a secret nonce, and publishes only that hash on chain.
The circuit recomputes the same commitment from the patient's private facts and
asserts it is one an issuer already attested.

So a patient can only prove things about data a clinic actually vouched for —
and the clinic vouched for it without ever restating what it contains.

---

## What is on the ledger

Everything, deliberately. The project's argument is that the public record is
*boring*, and stays boring no matter how many people use it.

| Public | Private |
|---|---|
| Trial criteria — condition, age band | Diagnosis code |
| Issuer attestations — blinded commitments | Age |
| Eligibility results — nullifier → `true` | Excluded-medication flag |
| A count of checks performed | Record blinding nonce |
| | Patient secret key |

The interface has a page dedicated to showing this — the adversary's view — for
exactly that reason.

---

## Further reading

| Document | What it covers |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | The circuit, the dual-ledger model, the disclosure boundary |
| [TECHNOLOGY.md](TECHNOLOGY.md) | The Midnight stack, pinned versions, why each piece |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Running it, and the public-testnet finding |
| [SUSTAINABILITY.md](SUSTAINABILITY.md) | Whether this survives contact with the real world |
| [TESTING.md](TESTING.md) | What is verified, and how |
| [SETUP.md](SETUP.md) | Toolchain installation |
| [VERSIONS.md](VERSIONS.md) | Version discovery and drift notes |
