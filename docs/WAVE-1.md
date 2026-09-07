# Aegis — Wave 1 Build Guide

**Project:** Aegis — a privacy-preserving clinical-trial-matching dApp on Midnight.
**Wave 1 goal:** a compiling Compact contract that proves trial eligibility with
private witness state, one passing test, and a simple functional UI wired to it.
**Wave 1 window:** August 13 – September 2, 2026. Submission by the deadline.

> **The one rule that beats every other rule:** the Compact contract MUST compile.
> A non-compiling contract is auto-disqualified before any rubric points are
> counted. Everything below is ordered so a time crunch never costs you the gate.

---

## How this guide is structured

1. **Part A — Pre-flight** (do before Aug 13): environment + version capture.
2. **Part B — The build procedure** (Aug 13 onward): what *you* do, in order.
3. **Part C — The pasteable prompt**: drop into Claude Code in the project dir.
4. **Part D — README template**: the documentation that earns rubric points.
5. **Part E — Wave 1 submission checklist**: what must be true before you submit.

---

## Part A — Pre-flight (before the window opens)

You can't write contest code before Aug 13, but you *can* prove your toolchain
works and capture your real version numbers. Do this now so day one is building,
not debugging.

**A1. Finish `SETUP.md`.** Every box in its Section 8 must be green: Node,
Docker, Compact compiler, VS Code extension, Lace wallet, and a Hello World that
compiles and passes `yarn test:local`.

**A2. Bump Node to 24.** The contract toolchain needs v22+, but the UI scaffold
(bboard) needs **v24.11.1+**. Install the higher one now so the UI step doesn't
fail later:
```bash
nvm install 24
nvm use 24
nvm alias default 24
node --version   # expect v24.11.1 or newer
```

**A3. Capture your real versions** into a scratch note. These pin everything —
never let any generated code assume version numbers that differ from these:
```bash
node --version
compact compile --version
compact list --installed
```
Write down: Node version, Compact compiler version, and the language version the
compiler supports (the `pragma language_version` you'll declare — currently 0.23,
but trust *your* compiler over this doc).

**A4. Note the runtime version** you'll pin the frontend to. After you clone the
starter in B2, check its `package.json` for `@midnight-ntwrk/compact-runtime` and
record that too. Compiler + runtime + pragma drifting apart is the #1 cause of
"compiles but fails at runtime." Keep them aligned.

---

## Part B — The build procedure (Aug 13 onward)

This is the human-facing sequence. Part C's prompt drives most of it inside
Claude Code, but *you* stay in control at each checkpoint. Read the compiler
output at every step — that's how you'll answer judges' interview questions.

### B1. Create the repo (public, from the start)
- New public GitHub repo named `aegis` (or `aegis-midnight`).
- Clone it locally. All work happens here.
- Add the **`midnightntwrk`** topic label on GitHub now (hard eligibility
  requirement — do it immediately so you can't forget).
- Add an **Apache-2.0** LICENSE file (required by the rules for contest code).

### B2. Prove the toolchain on the untouched starter
- Clone `example-hello-world` into a temp folder, `yarn install`, compile, and
  run `yarn test:local`. Confirm it passes **unmodified**.
- If it fails here, stop and fix the environment. Do not write Aegis code on a
  broken toolchain.

### B3. Scaffold the Aegis contract project
- Mirror the starter's structure: `contracts/`, `src/`, `tests/`,
  `package.json`, `docker-compose.yml`.
- Set the contract `pragma language_version` to the version you captured in A3.
- Ensure `.gitignore` excludes wallet seeds, `deployment.json`, and any secret.

### B4. Get a minimal skeleton compiling FIRST
- Write `contracts/aegis.compact` with just a ledger field and one trivial
  circuit. Compile. Confirm success **before** adding real logic.

### B5. Add the trial-matching logic incrementally
- Add the `checkTrialEligibility` circuit and its predicates **one at a time,
  compiling after each**: diagnosis match → age band → excluded-medication flag
  → `disclose()` only the eligibility boolean + nullifier.
- Use a **simplified trust check** (e.g. a hash match) for the attestation in
  Wave 1. Real Schnorr signatures are Wave 2 — do not build them now.

### B6. Witness layer + one real test
- Implement the witness supplying private health facts locally.
- Write a test proving **both** an eligible patient (passes) and an ineligible
  one (fails). Run on local devnet. Both cases must behave correctly.

### B7. Frontend — only after B4–B6 pass
- Scaffold with Midnight's official tooling (`create-mn-app`, bboard/Full DApp
  template) — **not** a hand-rolled React app. The scaffold already solves Lace
  wallet integration, which is the hardest part.
- Confirm the scaffold builds and runs at `localhost:5173` **unmodified** first.
- Then adapt it to the three-step patient flow (see the design note in B8).
- Wire it to the Wave 1 contract on local devnet.

### B8. The UI design that scores (the "make privacy visible" flow)
Three screens, wired to the Wave 1 contract:
1. **Enter health facts** (diagnosis, age, medication flags) with a persistent,
   unmistakable "this stays on your device" marker (lock icon / private panel).
2. **Select a trial** and show its criteria, styled **distinctly as PUBLIC**
   data — reinforcing the dual-ledger split visually.
3. **Prove eligibility**: a button → an honest ZK-proof loading state ("your data
   never leaves this device") → a result screen showing **side by side** what
   stayed private vs. the single `eligible ✓` + nullifier the ledger saw.

That side-by-side result is the demo's money shot — it *is* the Midnight thesis.
Prioritize it over any other polish.

### B9. Documentation + submission assets
- Fill in the README (Part D template).
- Record a short video demo/pitch (required) walking the three-screen flow and
  narrating what stays private.
- Build a slide deck (required): problem, how Aegis uses Midnight's ZK model,
  the demo, the 3-wave roadmap.
- Submit the GitHub link, deck, and video via AKINDO before the deadline.

---

## Part C — The pasteable Claude Code prompt

Paste this into Claude Code **in your project directory** on Aug 13. It is
deliberately a *conductor*, not a vending machine: it stops at each step and
shows you compiler output. Read that output before letting it continue.

```
You are helping me build "Aegis," a privacy-preserving clinical-trial-matching
dApp on Midnight Network, in the Compact language. This is Wave 1 of a 3-wave
buildathon. The single most important constraint: THE COMPACT CONTRACT MUST
COMPILE — a non-compiling contract is auto-disqualified.

CRITICAL WORKING METHOD — follow exactly:
- Work in SMALL increments. After every change to a .compact file, run the
  compiler and show me the output BEFORE moving on. Never write a large
  contract in one pass.
- Do NOT assume any version numbers. First discover and pin the real ones
  (Step 0). If unsure of exact Compact syntax for the installed version, say so
  and test it against the compiler rather than guessing.
- Ground truth is: ledger declarations = public on-chain state; circuit
  functions = ZK-proven state transitions; witness declarations = TypeScript
  callbacks supplying PRIVATE inputs that never touch the chain. A private value
  must never reach ledger state without an explicit disclose().

STEP 0 — Environment & version pinning (no code yet):
- Run: node --version, compact compile --version, compact list --installed
- Report each. Confirm Node is v24.11.1+ (the UI scaffold needs it).
- Tell me the exact Compact compiler version and the language version to declare
  in `pragma language_version`. We pin the contract and the
  @midnight-ntwrk/compact-runtime dependency to THIS toolchain. Do not proceed
  until I confirm the versions.

STEP 1 — Prove the toolchain on the untouched starter:
- Clone https://github.com/midnightntwrk/example-hello-world.git into a temp
  dir, yarn install, compile the sample contract, run yarn test:local.
- Confirm it passes UNMODIFIED. If it fails, STOP and help me fix the
  environment before writing any Aegis code.
- Note the @midnight-ntwrk/compact-runtime version from its package.json; we
  match it.

STEP 2 — Scaffold the Aegis repo:
- Create a project mirroring the starter's structure (contracts/, src/, tests/,
  package.json, docker-compose.yml).
- Add: Apache-2.0 LICENSE, a README stub, and a .gitignore that EXCLUDES wallet
  seeds, deployment.json, and any secrets.
- Set the contract pragma to the language version confirmed in Step 0.

STEP 3 — Minimal compiling skeleton FIRST:
- Write contracts/aegis.compact with just: one ledger state field (e.g. a
  Counter for eligibility-check rounds, plus a set/field for nullifiers) and ONE
  trivial circuit that compiles. Compile it. Show me success before continuing.

STEP 4 — Add trial-matching logic incrementally (COMPILE AFTER EACH sub-step):
- (a) Add circuit `checkTrialEligibility` taking PRIVATE inputs via witness:
      patient diagnosis code, age, excluded-medication flag. Compile.
- (b) Add ONE predicate: assert diagnosis == the trial's required condition.
      Compile.
- (c) Add the age-band predicate (age within [min, max]). Compile.
- (d) Add the excluded-medication predicate (flag must be false). Compile.
- (e) disclose() ONLY an eligibility boolean and a nullifier to the ledger —
      NEVER the private facts. Compile.
- For Wave 1 use a SIMPLIFIED trust check for the attestation (e.g. a hash
  match). Real Schnorr signature verification is Wave 2 — do not build it now.

STEP 5 — Witness layer + one real test:
- Implement the witness (TypeScript) supplying the private facts locally.
- Write a test proving BOTH: an eligible patient passes, and an ineligible one
  fails (wrong diagnosis, out-of-band age, or excluded med present). Run on
  local devnet. Show both behaving correctly.

STEP 6 — Contract-side hygiene:
- Ensure the repo is well-organized with clear folder names.
- Summarize in the README: what Aegis does, the privacy model (what stays
  private vs disclosed), and setup/run instructions.
- Remind me to add the "midnightntwrk" GitHub topic label and confirm Apache-2.0.

STEP 7 — Frontend (ONLY after Steps 0–6 pass and the contract compiles):
- Scaffold the UI with Midnight's official tooling, NOT a hand-rolled React app.
  Use create-mn-app with the bboard / Full DApp template (confirm the exact
  current template name against the CLI). It already includes Lace wallet
  integration and the Midnight provider — do not reinvent that.
- Confirm the scaffolded UI builds and runs at localhost:5173 UNMODIFIED first.
- THEN adapt it to Aegis's three-step patient flow:
  (1) private health-facts entry, visibly marked "never leaves your device";
  (2) trial + criteria selection, styled DISTINCTLY as PUBLIC data;
  (3) prove-eligibility action with an honest ZK-proof loading state, then a
      result screen showing SIDE BY SIDE: what stayed PRIVATE vs the single
      disclosed eligible/nullifier value on the ledger.
- Wire it to the Wave 1 contract on local devnet. Keep wallet connect minimal in
  Wave 1; real Lace connect is a Wave 2 deepening.
- Do NOT break the scaffold's wallet-provider architecture for styling. Layer
  aesthetics on top of the working structure. Prioritize the private-vs-disclosed
  visual — it is the demo's core moment.

PRIORITY REMINDER: Steps 0–5 (a compiling, tested contract) are the technical
gate and come FIRST. If Wave 1 time runs short, a compiling contract + simple
working UI beats a beautiful UI + broken contract, which is auto-disqualified.

Start with STEP 0 now. Do not skip ahead. After each step, pause and show me the
compiler/test output.
```

---

## Part D — README template (documentation that scores)

The rubric explicitly rewards "a clear README" and "ecosystem attribution" inside
the 40% engineering criterion. Fill this in as you build; don't leave it to the
last hour.

```markdown
# Aegis

Prove you qualify for a clinical trial — without revealing your diagnosis, age,
or medications. Aegis is a privacy-preserving trial-matching dApp built on
Midnight using zero-knowledge selective disclosure.

## The problem
Clinical-trial recruitment forces patients to hand sensitive medical data to
sponsors just to check if they qualify. Most never enroll — their private data
was exposed for nothing. Aegis flips this: patients prove eligibility, sponsors
learn only yes/no.

## How it works (Midnight's dual-ledger model)
- **Private (witness, never on-chain):** diagnosis code, age, medication flags,
  and the issuer's attestation.
- **Public (ledger):** only the disclosed result — an eligibility boolean and a
  nullifier that prevents attestation reuse.
- **The circuit** verifies the attestation and asserts the trial's criteria
  (diagnosis match AND age in band AND no excluded medication), then discloses
  only the result. Compact's compiler enforces this: private values cannot reach
  public state without an explicit `disclose()`.

## Architecture
[insert the private/public flow diagram]

## Tech stack
- Compact (language version X.XX) — pin to your compiler
- @midnight-ntwrk/compact-runtime ^X.XX — pin to match
- Midnight proof server (Docker)
- React + Vite + TypeScript frontend (scaffolded via create-mn-app)
- Lace (Midnight edition) wallet

## Getting started
[setup steps: toolchain, proof server, compile, test, run UI — link SETUP.md]

## Running the tests
[the eligible / ineligible test commands and expected output]

## Roadmap
- **Wave 1 (done):** eligibility circuit, private witness state, simplified
  trust, tested contract, three-step patient UI on local devnet.
- **Wave 2:** real Schnorr-signed issuer attestation + in-circuit verification;
  Lace wallet connect; issuer/clinic view; broader tests.
- **Wave 3:** nullifier/anti-replay hardening; multi-trial + multi-issuer;
  verifier/sponsor dashboard; public-testnet deployment; product materials.

## Ecosystem attribution
Built on Midnight Network. Scaffolded from Midnight's official example templates
(example-hello-world / bboard). Uses the Compact language and toolchain.

## License
Apache-2.0
```

---

## Part E — Wave 1 submission checklist

Before you submit on AKINDO, confirm ALL of these:

- [ ] Contract **compiles** (`compact compile` succeeds) — the technical gate
- [ ] At least one circuit with private witness state and `disclose()` used correctly
- [ ] Test file present; eligible **and** ineligible cases pass on local devnet
- [ ] Frontend builds, runs, and connects to the contract end-to-end (local devnet)
- [ ] The private-vs-disclosed result screen is present and clear
- [ ] Repo is public and well-organized with a clear README
- [ ] **`midnightntwrk`** GitHub topic label added
- [ ] **Apache-2.0** LICENSE present
- [ ] Ecosystem attribution to Midnight in the README
- [ ] Contract/runtime/pragma versions aligned (no drift)
- [ ] No wallet seed, `deployment.json`, or secret committed to the repo
- [ ] Video demo/pitch recorded and uploaded
- [ ] Slide deck prepared and uploaded
- [ ] GitHub link + deck + video submitted via AKINDO before the deadline

---

## Scope honesty (read this once)

Getting a compiling contract, a passing test, AND a polished wallet-connected UI
inside 20 days on a young toolchain is ambitious the first time through. It is
achievable — but if something must give, let it be UI polish, never the gate. A
clean-but-simple Wave 1 UI that visibly refines in Wave 2 tells a *better*
progress story than peaking in Wave 1 anyway. Build the gate first, then make it
beautiful.

Exact Compact syntax for some predicates is only knowable by compiling against
your installed version — which is why Step 0 discovers versions and the prompt
adapts to reality over assumption. Trust your compiler over any version number
written in this guide.

---

*Next: `docs/WAVE-2.md` — real attestation signatures + Lace wallet + issuer view.*
