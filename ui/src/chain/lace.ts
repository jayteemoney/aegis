import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import {
  Transaction,
  type FinalizedTransaction,
  type TransactionId,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type {
  MidnightProvider,
  UnboundTransaction,
  WalletProvider,
} from '@midnight-ntwrk/midnight-js-types';
import {
  fromHex,
  parseCoinPublicKeyToHex,
  parseEncPublicKeyToHex,
  toHex,
} from '@midnight-ntwrk/midnight-js-utils';
import type { NetworkId } from '@midnight-ntwrk/midnight-js-network-id';

/**
 * Talking to a browser wallet.
 *
 * Wallets inject an `InitialAPI` under `window.midnight`, keyed by an
 * arbitrary id. A wallet may inject several entries — different API versions of
 * the same product — so the DApp picks one rather than assuming there is
 * exactly one.
 *
 * Everything the wallet is asked to do here concerns *transactions*: balance
 * one, prove one, submit one. It is never given a health fact. The witnesses
 * are consumed inside the circuit before a transaction exists, so there is
 * nothing private left in the object that crosses this boundary.
 */

export type DetectedWallet = {
  /** The key under `window.midnight`. Needed to connect. */
  id: string;
  name: string;
  rdns: string;
  icon: string;
  apiVersion: string;
};

export function detectWallets(): DetectedWallet[] {
  const injected = typeof window === 'undefined' ? undefined : window.midnight;
  if (!injected) return [];

  return Object.entries(injected)
    .filter((entry): entry is [string, InitialAPI] => typeof entry[1]?.connect === 'function')
    .map(([id, api]) => ({
      id,
      // These strings come from an extension we do not control. They are only
      // ever rendered as text and as an <img src>, never as markup.
      name: api.name ?? id,
      rdns: api.rdns ?? id,
      icon: api.icon ?? '',
      apiVersion: api.apiVersion ?? 'unknown',
    }));
}

export async function connectWallet(id: string, networkId: string): Promise<ConnectedAPI> {
  const api = window.midnight?.[id];
  if (!api) throw new Error(`No wallet is injected under window.midnight.${id}`);

  const connected = await api.connect(networkId);

  // Give the wallet a chance to collect every permission we will need up
  // front, rather than interrupting the user mid-proof.
  await connected
    .hintUsage([
      'getShieldedAddresses',
      'getConfiguration',
      'getProvingProvider',
      'balanceUnsealedTransaction',
      'submitTransaction',
    ])
    .catch(() => {
      /* hinting is advisory; a wallet that does not support it still works */
    });

  return connected;
}

/**
 * Adapts the wallet connector to the two provider interfaces midnight-js
 * needs: balancing (WalletProvider) and submission (MidnightProvider).
 *
 * The connector speaks hex-encoded serialized transactions, while midnight-js
 * passes the ledger's `Transaction` objects, so this is where the two meet.
 */
export class ConnectorWalletProvider implements WalletProvider, MidnightProvider {
  private constructor(
    private readonly api: ConnectedAPI,
    private readonly coinPublicKey: string,
    private readonly encryptionPublicKey: string,
  ) {}

  static async create(api: ConnectedAPI, networkId: NetworkId): Promise<ConnectorWalletProvider> {
    const { shieldedCoinPublicKey, shieldedEncryptionPublicKey } =
      await api.getShieldedAddresses();

    // The wallet reports Bech32m; midnight-js wants raw hex.
    return new ConnectorWalletProvider(
      api,
      parseCoinPublicKeyToHex(shieldedCoinPublicKey, networkId),
      parseEncPublicKeyToHex(shieldedEncryptionPublicKey, networkId),
    );
  }

  getCoinPublicKey(): string {
    return this.coinPublicKey;
  }

  getEncryptionPublicKey(): string {
    return this.encryptionPublicKey;
  }

  /**
   * Hand the proven-but-unbalanced transaction to the wallet, which adds the
   * inputs and outputs that settle its imbalances and pays the fee, and seals
   * it. What comes back is ready to submit.
   */
  async balanceTx(tx: UnboundTransaction): Promise<FinalizedTransaction> {
    const { tx: balanced } = await this.api.balanceUnsealedTransaction(toHex(tx.serialize()));
    return Transaction.deserialize('signature', 'proof', 'binding', fromHex(balanced));
  }

  async submitTx(tx: FinalizedTransaction): Promise<TransactionId> {
    await this.api.submitTransaction(toHex(tx.serialize()));
    // The connector's submit resolves with nothing, so derive the identifier
    // from the transaction we just sent.
    const [id] = tx.identifiers();
    if (!id) throw new Error('Submitted transaction reported no identifier');
    return id;
  }
}
