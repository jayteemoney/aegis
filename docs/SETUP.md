# Aegis — Environment Setup Checklist

This document takes you from a bare machine to a working Midnight development
environment, verified by compiling and deploying the official Hello World
contract. Do **not** start writing Aegis contract code until every box in
**Section 8 (Final Verification)** is checked.

Everything here is required by the Midnight toolchain as documented on
`docs.midnight.network` (installation + quickstart). Versions move fast on
Midnight, so where a version is named, treat it as a floor and check the
release notes if something fails.

---

## 0. What you are installing, and why

| Tool | Role | Why you can't skip it |
|------|------|-----------------------|
| Node.js v22+ | JS runtime | The DApp, tests, witnesses, and CLI all run on it |
| Docker | Runs the proof server | ZK proofs are generated locally by a Dockerized proof server; no Docker = no proofs = nothing deploys |
| Compact compiler | Compiles `.compact` → ZK circuits + TS API | This is *the* toolchain; the contest's technical gate is "the Compact contract compiles" |
| Compact VS Code extension | Syntax + live error checking | Catches non-compiling code as you type — directly de-risks the technical gate |
| Lace (Midnight) wallet | Browser wallet | Needed to deploy to the public test network and for the frontend in Wave 2 |
| Git + a GitHub account | Version control + submission | The submission *is* a GitHub repo link; commit history is part of your credibility |

> **Platform note.** macOS and Linux use the native path below.
> **Windows users must use WSL2** — the Compact installer is a POSIX shell
> script and will fail in PowerShell or Command Prompt. See Section 7.

---

## 1. Node.js v22+

The docs require Node.js version 22 or newer. Use `nvm` so you can switch
versions per-project and avoid `sudo`-permission headaches.

**Install nvm (macOS/Linux):**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# then restart your terminal, or:
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

**Install and select Node 22:**
```bash
nvm install 22
nvm use 22
nvm alias default 22
```

**✅ Verify:**
```bash
node --version   # expect v22.x.x or higher
npm --version    # any recent version
```

---

## 2. Yarn

The Midnight example repos (including the Hello World starter you'll clone in
Section 8) use Yarn.

```bash
npm install --global yarn
```

**✅ Verify:**
```bash
yarn --version   # expect 1.22.x or newer
```

---

## 3. Docker

The proof server runs as a Docker container. On desktop machines, install
**Docker Desktop**; on a Linux server, Docker Engine is fine.

- macOS / Windows: install **Docker Desktop** from docker.com and launch it.
- Linux: install Docker Engine via your distro, then `sudo systemctl start docker`.

**Important:** Docker must be *running* (not just installed) whenever you
compile or deploy. On a laptop, that means the Docker Desktop app is open.

**✅ Verify:**
```bash
docker --version          # prints a version
docker run hello-world    # prints "Hello from Docker!" — proves the engine works
```

If `docker run hello-world` fails, the engine isn't running or your user
isn't in the `docker` group (Linux: `sudo usermod -aG docker $USER`, then log
out and back in).

---

## 4. Compact compiler + toolchain

This installs the Compact compiler, formatter, and the `compact` version
manager.

```bash
curl --proto '=https' --tlsv1.2 -LsSf \
  https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
```

The installer updates your PATH automatically. Reload your shell so the change
takes effect:
```bash
# pick the one matching your shell:
source ~/.bashrc      # bash
source ~/.zshrc       # zsh
```

Now install the actual compiler toolchain (the line above installs the
manager; this fetches a compiler version):
```bash
compact update
```

**✅ Verify:**
```bash
compact --version              # version of the manager/toolchain
compact compile --version      # compiler version — expect a 0.2x line
compact list --installed       # shows installed compiler versions
```

> If you see `command not found: compact`, the binary isn't on your PATH.
> Re-run the `source` step, or follow the docs' "Update your shell PATH"
> troubleshooting section. Do not proceed until `compact --version` works.

> Aegis targets **Compact language version 0.23** (declared as
> `pragma language_version 0.23;` at the top of every contract). If
> `compact list` shows only older versions, run `compact update` again.

---

## 5. VS Code + Compact extension

VS Code with the Compact extension gives you syntax highlighting and, more
importantly, **live semantic error checking** — it flags non-compiling code
before you ever run the compiler. Given the contest's auto-DQ technical gate,
this is not optional polish; it's a safety net.

1. Install **VS Code** from code.visualstudio.com.
2. Install the **Compact extension**. The current, reliable method is a manual
   VSIX install (the extension is distributed from Midnight's releases page,
   not always the Marketplace):
   - Download the `.vsix` from the Midnight releases page
     (search the docs page "Visual Studio Code extension for Compact" for the
     current release link — the version increments, so grab the latest).
   - In VS Code: open the **Extensions** panel → click the **⋯** menu →
     **Install from VSIX…** → select the downloaded file.
3. Restart VS Code if prompted, so the language server initializes.

**✅ Verify:** open any `.compact` file and confirm keywords like `circuit`,
`witness`, and `ledger` are colour-highlighted, and that a deliberate typo
gets underlined.

---

## 6. Lace (Midnight) wallet — needed from Wave 2, set up now

You'll deploy to a local devnet first (no wallet needed for the very first
Hello World test), but you need Lace for public-testnet deploys and the
frontend. Set it up now so it's not a Wave 2 blocker.

1. Use **Google Chrome** (Lace's Midnight build is Chrome-only right now).
2. Install the **Lace** extension from the Chrome Web Store, pin it.
3. Open Lace → **Create a new wallet** → set a password.
4. **Write your seed phrase on paper. Never store it digitally, never commit
   it, never paste it into any file in the repo.**
5. Copy your wallet address.
6. Point Lace at your local proof server: **Settings » Midnight » Local
   (http://localhost:6300)**.
7. Fund the wallet from the Midnight test faucet (request test tokens to your
   address) so you have balance for test deploys.

**✅ Verify:** the Lace icon is in your Chrome toolbar and shows your new
wallet with a copyable address.

---

## 7. Windows only — WSL2 first

**Skip this section on macOS/Linux.**

You cannot run the Midnight toolchain natively on Windows. PowerShell and
Command Prompt both fail because the Compact installer is a POSIX shell
script. Do this first, then run Sections 1–6 *inside Ubuntu*:

1. Open **PowerShell as Administrator** and run:
   ```powershell
   wsl --install
   ```
   This installs WSL2 + Ubuntu. Reboot when prompted.
2. Launch **Ubuntu** from the Start Menu; create your Linux username/password.
3. Install **Docker Desktop** on Windows and, in its settings, enable
   **"Use the WSL 2 based engine"** and enable integration with your Ubuntu
   distro. (Docker runs on the Windows side but is callable from Ubuntu.)
4. Allocate enough memory to WSL for the proof server — create/edit
   `C:\Users\<you>\.wslconfig`:
   ```ini
   [wsl2]
   memory=8GB
   processors=4
   ```
   Then in PowerShell: `wsl --shutdown`, and reopen Ubuntu.
5. Now run **Sections 1, 2, 4, 5** (Node via nvm, Yarn, Compact, VS Code —
   VS Code installs on Windows but opens the WSL folder via the "WSL" extension)
   **inside the Ubuntu terminal**. Section 3 (Docker) and Section 6 (Lace)
   live on the Windows side.
6. Keep all project files inside the Linux filesystem (e.g. `~/midnight/aegis`),
   **not** under `/mnt/c/...` — building on the Windows mount is slow and
   causes permission issues.

---

## 8. Final verification — compile & deploy Hello World

This proves the *entire* chain works before you write any Aegis code. Don't
skip it; if something's broken, you want to find out here, not mid-build.

**1. Start Docker** (Docker Desktop open, or `sudo systemctl start docker`).

**2. Clone and install the official starter:**
```bash
mkdir -p ~/midnight && cd ~/midnight
git clone https://github.com/midnightntwrk/example-hello-world.git
cd example-hello-world
yarn install
```

**3. In a SEPARATE terminal, start the proof server and leave it running:**
```bash
cd ~/midnight/example-hello-world
yarn env:up
```
Wait until it logs that it's listening (port 6300). Leave this terminal alone.

*(Alternatively, run the proof server directly:*
```bash
docker run -p 6300:6300 midnightntwrk/proof-server:latest midnight-proof-server -v
```
*)*

**4. Back in your first terminal, compile the sample contract:**
```bash
cd contracts
compact compile hello-world.compact managed/hello-world
```
Expect output like `Compiling 1 circuits: circuit "storeMessage" (k=6, rows=26)`
and a new `managed/hello-world/` folder containing `contract/`, `keys/`,
`zkir/`, `compiler/`.

**5. Run the local devnet test (uses pre-funded wallets, no Lace needed):**
```bash
cd ..
yarn test:local
```
Expect it to deploy the contract and pass both tests
("Deploys the contract", "Stores Hello World!").

---

## ✅ You are ready when ALL of these are true

- [ ] `node --version` → v22+
- [ ] `yarn --version` → prints a version
- [ ] `docker run hello-world` → succeeds
- [ ] `compact compile --version` → prints a 0.2x compiler version
- [ ] `compact list --installed` → shows a version supporting language 0.23
- [ ] Compact VS Code extension highlights a `.compact` file
- [ ] Lace wallet installed, wallet created, seed phrase on paper, address copied
- [ ] Proof server starts and listens on `localhost:6300`
- [ ] `compact compile hello-world.compact …` produces the `managed/` artifacts
- [ ] `yarn test:local` deploys Hello World and both tests pass

When every box is checked, the environment is proven end-to-end and we start
Wave 1: scaffolding the Aegis contract.

---

## Troubleshooting quick-reference

| Symptom | Fix |
|---------|-----|
| `command not found: compact` | Re-`source` your shell config; check PATH per docs |
| `compact` runs but wrong version | `compact update`, then `compact list --installed` |
| Compile hangs a long time | Normal on first run (key generation); to check syntax only, use `--skip-zk` |
| `yarn env:up` / proof server won't start | Docker engine isn't running, or port 6300 is taken |
| Proof server version mismatch errors | Match proof-server image version to your toolchain (see release notes) |
| Deploy fails with no balance | Fund the Lace wallet from the faucet (public testnet only) |
| Windows: installer script errors | You're in PowerShell — run it inside Ubuntu/WSL2 instead |
| WSL builds painfully slow | Move the project off `/mnt/c` into the Linux home dir |

---

*Setup complete → proceed to `docs/WAVE-1.md` for the first build stage.*
