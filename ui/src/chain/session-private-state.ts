import type {
  PrivateStateProvider,
  PrivateStateExport,
  SigningKeyExport,
} from '@midnight-ntwrk/midnight-js-types';

/**
 * Private state that lives for exactly one tab session.
 *
 * The Node scripts use a LevelDB-backed store, which is right for a service
 * that must survive a restart. For a patient it is the wrong default: writing
 * a diagnosis to disk creates the durable record Aegis exists to avoid. This
 * provider keeps everything in memory, so closing the tab destroys it, and
 * nothing is left for a later reader of the machine to find.
 *
 * Export and import are deliberately unimplemented rather than silently
 * no-op — a backup of health facts is not something to provide by accident.
 */
export function createSessionPrivateStateProvider<PS>(): PrivateStateProvider<string, PS> {
  const states = new Map<string, PS>();
  const signingKeys = new Map<string, string>();
  let contractAddress: string | null = null;

  const requireAddress = (): string => {
    if (contractAddress === null) {
      throw new Error('Contract address not set. Call setContractAddress() first.');
    }
    return contractAddress;
  };

  const scoped = (id: string) => `${requireAddress()}:${id}`;

  const unsupported = (what: string) => (): never => {
    throw new Error(`${what} is not available in the browser session store.`);
  };

  return {
    setContractAddress(address: string): void {
      contractAddress = address;
    },
    async set(privateStateId: string, state: PS): Promise<void> {
      states.set(scoped(privateStateId), state);
    },
    async get(privateStateId: string): Promise<PS | null> {
      return states.get(scoped(privateStateId)) ?? null;
    },
    async remove(privateStateId: string): Promise<void> {
      states.delete(scoped(privateStateId));
    },
    async clear(): Promise<void> {
      states.clear();
    },
    async setSigningKey(address: string, signingKey: string): Promise<void> {
      signingKeys.set(address, signingKey);
    },
    async getSigningKey(address: string): Promise<string | null> {
      return signingKeys.get(address) ?? null;
    },
    async removeSigningKey(address: string): Promise<void> {
      signingKeys.delete(address);
    },
    async clearSigningKeys(): Promise<void> {
      signingKeys.clear();
    },
    exportPrivateStates: unsupported('Exporting private state') as unknown as () => Promise<PrivateStateExport>,
    importPrivateStates: unsupported('Importing private state') as never,
    exportSigningKeys: unsupported('Exporting signing keys') as unknown as () => Promise<SigningKeyExport>,
    importSigningKeys: unsupported('Importing signing keys') as never,
  };
}
