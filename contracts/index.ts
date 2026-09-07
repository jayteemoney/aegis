import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import path from 'node:path';

import { aegisWitnesses } from '../src/witnesses.js';

export {
  Contract,
  ledger,
  pureCircuits,
  type Ledger,
  type ImpureCircuits,
  type PureCircuits,
  type TrialCriteria,
  type Witnesses,
} from './managed/aegis/contract/index.js';

import { Contract } from './managed/aegis/contract/index.js';

const currentDir = path.resolve(new URL(import.meta.url).pathname, '..');

/** Location of the compiled ZK assets (keys + zkir) produced by `yarn compile`. */
export const zkConfigPath = path.resolve(currentDir, 'managed', 'aegis');

/**
 * The Aegis contract, bound to its real witness implementations.
 *
 * The starter's `withVacantWitnesses` is deliberately NOT used here: Aegis's
 * whole point is that circuits draw on private patient state.
 */
export const CompiledAegisContract = CompiledContract.make(
  'AegisContract',
  Contract,
).pipe(
  CompiledContract.withWitnesses(aegisWitnesses),
  CompiledContract.withCompiledFileAssets(zkConfigPath),
);
