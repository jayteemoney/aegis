/**
 * Show what the chain holds for an address, in seconds.
 *
 *   npx vite-node scripts/utxos.ts preprod mn_addr_preprod1...
 *
 * This asks the indexer directly rather than building a wallet, which matters:
 * a headless wallet has no persisted DUST state and rescans from genesis, so
 * the same question through the SDK takes over a day on preprod. Here it is a
 * websocket subscription that replays the address's history and stops.
 *
 * Use it to separate two failures that look identical from inside a wallet:
 * funds that never arrived, and funds that arrived but are not being displayed.
 */
import { createClient } from 'graphql-ws';
import { WebSocket } from 'ws';

import { NETWORKS } from '../src/config.js';

const network = (process.argv[2] ?? 'preprod').toLowerCase();
const address = process.argv[3];

if (!address) {
  console.error('Usage: npx vite-node scripts/utxos.ts <network> <unshielded address>');
  process.exit(1);
}

const config = NETWORKS[network];
if (!config) {
  console.error(`Unknown network '${network}'. Known: ${Object.keys(NETWORKS).join(', ')}`);
  process.exit(1);
}

/** Native NIGHT is the all-zero token type. */
const NATIVE = /^0+$/;

const QUERY = `
subscription($addr: UnshieldedAddress!) {
  unshieldedTransactions(address: $addr) {
    __typename
    ... on UnshieldedTransaction {
      createdUtxos { value tokenType outputIndex registeredForDustGeneration }
      spentUtxos { value tokenType }
    }
    ... on UnshieldedTransactionsProgress { highestTransactionId }
  }
}`;

type Utxo = {
  value: string;
  tokenType: string;
  outputIndex: number;
  registeredForDustGeneration: boolean;
};

const client = createClient({ url: config.indexerWS, webSocketImpl: WebSocket });

let created = 0n;
let spent = 0n;
let registered = 0;
let utxoCount = 0;

console.log(`\n  Address   ${address}`);
console.log(`  Network   ${network}\n`);

function report(): never {
  const balance = created - spent;
  console.log(`\n  UTxOs received       ${utxoCount}`);
  console.log(`  Registered for DUST  ${registered}`);
  console.log(`  Balance              ${balance} (${Number(balance) / 1e6} NIGHT)\n`);

  if (balance <= 0n) {
    console.log(`  ⛔ No funds. Request tNIGHT at ${config.faucet}\n`);
  } else if (registered === 0) {
    console.log(
      `  ⚠️  Funded, but no NIGHT is registered for DUST generation.\n` +
        `     Fees are paid in DUST, so register it in your wallet before deploying.\n`,
    );
  } else {
    console.log(`  ✅ Funded and registered. DUST accrues from here.\n`);
  }
  process.exit(0);
}

// The subscription stays open to stream future transactions; we only want the
// backlog, so stop once it goes quiet.
//
// The first message can take a while — the indexer replays history before it
// says anything — so wait generously for it, and only switch to a short idle
// window once data is actually flowing. Getting this wrong reports an empty
// wallet for a funded address, which is the exact confusion this script exists
// to resolve.
const FIRST_MESSAGE_MS = 60_000;
const IDLE_AFTER_DATA_MS = 8_000;

let idle: NodeJS.Timeout = setTimeout(report, FIRST_MESSAGE_MS);
let sawData = false;
const resetIdle = () => {
  clearTimeout(idle);
  idle = setTimeout(report, sawData ? IDLE_AFTER_DATA_MS : FIRST_MESSAGE_MS);
};

client.subscribe(
  { query: QUERY, variables: { addr: address } },
  {
    next: (msg) => {
      sawData = true;
      resetIdle();
      const data = (msg as { data?: { unshieldedTransactions?: Record<string, unknown> } }).data
        ?.unshieldedTransactions;
      if (!data || data['__typename'] !== 'UnshieldedTransaction') return;

      for (const u of (data['createdUtxos'] as Utxo[]) ?? []) {
        utxoCount += 1;
        created += BigInt(u.value);
        if (u.registeredForDustGeneration) registered += 1;
        const kind = NATIVE.test(u.tokenType) ? 'NIGHT' : `token ${u.tokenType.slice(0, 12)}…`;
        console.log(
          `  + ${String(u.value).padStart(14)}  ${kind}  ` +
            `dust=${u.registeredForDustGeneration ? 'registered' : 'no'}`,
        );
      }
      for (const u of (data['spentUtxos'] as Utxo[]) ?? []) {
        spent += BigInt(u.value);
        console.log(`  - ${String(u.value).padStart(14)}  spent`);
      }
    },
    error: (err) => {
      console.error('  Subscription failed:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    },
    complete: report,
  },
);
