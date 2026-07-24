import type { PairedExperimentResult } from "@agorasim/core";

export interface PairSummary {
  pairId: string;
  protocolSeed: string;
  protocolHash: string;
  decisionMode: PairedExperimentResult["control"]["decisionMode"];
  pairedEffect: number;
  controlAdoptionRate: number;
  treatmentAdoptionRate: number;
  validation: PairedExperimentResult["validation"];
  createdAt: string;
}

export interface StoredPair {
  summary: PairSummary;
  result: PairedExperimentResult;
}

export interface RunStore {
  migrate(): Promise<void>;
  close(): Promise<void>;
  savePair(pair: StoredPair): Promise<void>;
  getPair(pairId: string): Promise<StoredPair | null>;
  listPairs(): Promise<PairSummary[]>;
}
