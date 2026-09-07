# Pinned toolchain versions

Captured from the machine Aegis was built and tested on
(macOS 26.5.2, arm64), on 2026-08-12. **Trust this file over any version
number written in `SETUP.md` or `WAVE-1.md`** — those were written before the
toolchain was installed, and Midnight moves fast.

## Verified by running the tools

| Thing | Command | Value |
|---|---|---|
| Node.js | `node --version` | `v24.19.0` |
| npm | `npm --version` | `11.17.0` |
| Yarn | `yarn --version` | `1.22.22` |
| Docker | `docker --version` | `29.7.2` |
| Compact devtools | `compact --version` | `compact 0.5.1` |
| Compact compiler | `compact compile --version` | `0.31.1` |
| Compact language | *see below* | **`0.23`** |

## How the language version was determined

The docs' Compact language reference currently describes **language v1.0**
(`pragma language_version >= 1.0.0;`), which the shipping compiler does **not**
accept. The installed compiler was asked directly:

```
$ compact compile --skip-zk probe.compact out    # pragma language_version 0.24
Exception: probe.compact line 1 char 1:
  language version 0.23.0 mismatch
```

Compiler `0.31.1` accepts exactly **language 0.23**, so every contract declares:

```compact
pragma language_version 0.23;
```

Available compiler versions at time of install: 0.31.1, 0.31.0, 0.30.0, 0.29.0,
0.28.0, 0.26.0, 0.25.0, 0.24.0, 0.23.0, 0.22.0.

## Runtime / SDK versions

Resolved from `yarn.lock` after installing the pinned `package.json`:

| Package | Version |
|---|---|
| `@midnight-ntwrk/compact-runtime` | `0.16.0` |
| `@midnight-ntwrk/midnight-js-*` (all) | `4.1.1` |
| `@midnight-ntwrk/compact-js` | `2.5.1` |
| `@midnight-ntwrk/wallet-sdk` | `1.2.0` (pinned via `resolutions`) |
| `@midnight-ntwrk/ledger-v8` | `8.1.0` (pinned via `resolutions` — see below) |
| `@midnight-ntwrk/onchain-runtime-v3` | `3.0.0` |
| `@midnight-ntwrk/zkir-v2` | `2.1.0` |

## Docker images (local devnet)

| Service | Image |
|---|---|
| Proof server | `midnightntwrk/proof-server:8.1.0` |
| Indexer | `midnightntwrk/indexer-standalone:4.3.3` |
| Node | `midnightntwrk/midnight-node:1.0.0` |

## Gotcha: `ledger-v8` must be pinned

`@midnight-ntwrk/midnight-js-protocol@4.1.1` depends on `ledger-v8` at the
**exact** version `8.1.0`, while its sibling packages ask for `^8.1.0`. Once
`8.1.1` was published, a fresh `yarn install` produced **two** copies of
`ledger-v8` — one hoisted, one nested under `midnight-js-protocol`. Because the
package's classes carry private fields, TypeScript treats the two copies as
nominally distinct and `tsc --noEmit` fails across the wallet layer with dozens
of `Types have separate declarations of a private property 'type_'` errors.

The fix is a resolution forcing a single copy:

```json
"resolutions": {
  "@midnight-ntwrk/ledger-v8": "8.1.0"
}
```

The official `example-hello-world` starter does not hit this only because its
committed `yarn.lock` predates the `8.1.1` release. Any fresh project will.
