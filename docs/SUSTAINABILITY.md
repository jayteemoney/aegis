# Sustainability

Whether this survives contact with the real world — over time, and across the
places it would have to work.

---

## Over time

### The privacy guarantee does not decay

Most privacy systems degrade. Encrypted data that leaves your control is only as
safe as the algorithm, the key management, and the retention policy of whoever
holds it — all of which age. A breach in 2035 exposes a record transmitted in
2026.

Aegis has nothing to degrade, because **the values were never transmitted**.
There is no ciphertext to attack later, no key whose compromise is
retrospective, no retention policy to outlive. The public ledger contains
nullifiers and blinded commitments and will contain exactly that in twenty
years.

This is the property that makes the design worth building rather than a
better-configured database.

### Cost does not grow with usage

Each eligibility check is one transaction and one proof — roughly a second of
proving, on the patient's own device. There is no index to maintain, no
matching service to scale, no dataset that becomes more expensive and more
dangerous as it grows.

A sponsor's cost is publishing criteria once. An issuer's is one hash per
record. Neither grows with the number of people who ask.

### The compiler carries the invariant forward

The reason this survives maintenance by people who did not write it is that the
core guarantee is not a convention. A future contributor who tries to log a
diagnosis, add it to an analytics event, or slip it into public state gets a
**build failure**, not a code review comment they might win.

That is why the interface deliberately runs the *actual compiled circuit* rather
than a TypeScript reimplementation: there is no second copy of the rules to
drift out of agreement with the first.

---

## Across space

### Jurisdictions

Data-protection regimes differ, but they converge on one thing: obligations
attach to *holding* personal data. HIPAA, GDPR, and their equivalents all
regulate collection, processing, retention and transfer.

A sponsor using Aegis **never receives protected health information**. There is
no dossier to secure, retain, delete on request, or report when breached. The
compliance surface is not reduced — it largely does not arise.

This is also why the design puts the *issuer* rather than the patient at the
root of trust: clinics already hold these records lawfully. Aegis asks them to
publish one hash, not to take on anything new.

### Institutions

The three roles map onto parties that already exist and already have the right
incentives:

| Role | Already does this | Gains |
|---|---|---|
| **Clinic / EHR issuer** | Holds the record lawfully | Vouches without restating; no new liability |
| **Sponsor** | Publishes recruitment criteria | Recruits without becoming a data custodian |
| **Patient** | Answers screening questions | Answers them without surrendering the answers |

Nobody is asked to adopt a role that does not exist today, which is usually
where systems like this fail.

### Networks

Nothing in the contract, circuits, tests or interface is bound to a network. The
interface reads every record in `deployments/`, so local and public deployments
coexist and switch with a query parameter. Moving to mainnet is a deployment
record, not a rewrite.

---

## What would have to be true

Honest accounting of what this design still owes.

### Known limitations

- **Issuer trust is a hash match, not a signature.** Attestation is membership
  in a public `Set`, so anyone able to write to the contract could attest an
  arbitrary commitment. Real deployment needs Schnorr signature verification
  in-circuit, binding the attestation to a known issuer key.
- **Attestation linkability.** Proving eligibility discloses *which* attested
  commitment was used, so the issuer who registered it could link a check back
  to a patient. The health facts stay private regardless. Replacing `Set`
  membership with a Merkle-tree membership proof removes the disclosure.
- **Single-issuer, single-criteria-shape.** Real trials have inclusion and
  exclusion criteria far richer than one condition, an age band and one flag,
  and they trust many issuers.
- **Untested against a live browser wallet.** The connector adapter, browser
  deploy and browser submit all typecheck and build, but no real wallet has
  exercised them. See [DEPLOYMENT.md](DEPLOYMENT.md#why-there-is-no-public-testnet-deployment).

### Roadmap

- **Wave 2** — Schnorr-signed issuer attestations verified in-circuit; issuer
  and clinic views; a broader test matrix.
- **Wave 3** — Merkle-tree attestation membership, removing linkability;
  multi-trial and multi-issuer support; a sponsor dashboard.

Public-testnet deployment is not listed as a build item, because there is
nothing left to build for it. The path is written and waiting on a reachable
network.

### The honest limit

Aegis proves a patient satisfies criteria. It does not solve trial recruitment.
Enrolment involves consent, scheduling, site logistics and clinical judgement,
and none of that is a zero-knowledge problem.

What it does is remove one specific, avoidable harm: **the routine disclosure of
medical history to answer a question whose answer is usually no.** That harm is
large, entirely structural, and does not require solving the rest of the
pipeline to fix.
