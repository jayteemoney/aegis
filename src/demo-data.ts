import { type TrialCriteria } from '../contracts/managed/aegis/contract/index.js';
import { type AegisPrivateState } from './private-state.js';

/**
 * Shared demo fixtures.
 *
 * Used by the deploy script to seed public ledger state, by the UI to render
 * trials, and by the tests. One definition means the UI can never show a trial
 * that isn't actually on chain.
 */

/** Condition codes. Public — a sponsor states which condition it recruits for. */
export const CONDITIONS: Array<{ code: bigint; label: string }> = [
  { code: 100n, label: 'Type 2 Diabetes' },
  { code: 200n, label: 'Hypertension (stage 1)' },
  { code: 300n, label: 'Rheumatoid Arthritis' },
];

export const conditionLabel = (code: bigint): string =>
  CONDITIONS.find((c) => c.code === code)?.label ?? `Condition #${code}`;

export type DemoTrial = {
  id: bigint;
  name: string;
  sponsor: string;
  summary: string;
  criteria: TrialCriteria;
};

export const DEMO_TRIALS: DemoTrial[] = [
  {
    id: 1n,
    name: 'NOVA-2 glycaemic control study',
    sponsor: 'Meridian Therapeutics',
    summary:
      'Evaluating a once-weekly therapy for adults managing type 2 diabetes.',
    criteria: { conditionCode: 100n, minAge: 18n, maxAge: 65n },
  },
  {
    id: 2n,
    name: 'ATLAS blood-pressure cohort',
    sponsor: 'Cedar Clinical Research',
    summary:
      'Long-term observational cohort for stage 1 hypertension in older adults.',
    criteria: { conditionCode: 200n, minAge: 40n, maxAge: 75n },
  },
  {
    id: 3n,
    name: 'HELIOS joint-inflammation trial',
    sponsor: 'Northwind Institute',
    summary:
      'Phase II study of an anti-inflammatory in moderate rheumatoid arthritis.',
    criteria: { conditionCode: 300n, minAge: 25n, maxAge: 70n },
  },
];

export const bytes32 = (fill: number): Uint8Array => new Uint8Array(32).fill(fill);

export type DemoPatient = {
  id: string;
  label: string;
  note: string;
  state: AegisPrivateState;
};

/**
 * Demo patients whose records the deploy script attests on chain, so the UI
 * has genuine attested identities to prove against without every visitor
 * needing a funded wallet.
 */
export const DEMO_PATIENTS: DemoPatient[] = [
  {
    id: 'ada',
    label: 'Ada',
    note: 'Type 2 diabetes, 42, no excluded medication',
    state: {
      diagnosis: 100n,
      age: 42n,
      onExcludedMedication: false,
      recordNonce: bytes32(0xa1),
      secretKey: bytes32(0xa2),
    },
  },
  {
    id: 'ben',
    label: 'Ben',
    note: 'Type 2 diabetes, 71 — outside the NOVA-2 age band',
    state: {
      diagnosis: 100n,
      age: 71n,
      onExcludedMedication: false,
      recordNonce: bytes32(0xb1),
      secretKey: bytes32(0xb2),
    },
  },
  {
    id: 'chi',
    label: 'Chi',
    note: 'Type 2 diabetes, 40, takes an excluded medication',
    state: {
      diagnosis: 100n,
      age: 40n,
      onExcludedMedication: true,
      recordNonce: bytes32(0xc1),
      secretKey: bytes32(0xc2),
    },
  },
  {
    id: 'dee',
    label: 'Dee',
    note: 'Hypertension, 55 — qualifies for ATLAS, not NOVA-2',
    state: {
      diagnosis: 200n,
      age: 55n,
      onExcludedMedication: false,
      recordNonce: bytes32(0xd1),
      secretKey: bytes32(0xd2),
    },
  },
];
