import { Pool } from "pg";

import type { PairSummary, RunStore, StoredPair } from "./store.js";

const MIGRATION = `
CREATE TABLE IF NOT EXISTS paired_runs (
  pair_id text PRIMARY KEY,
  protocol_seed text NOT NULL,
  protocol_hash text NOT NULL,
  decision_mode text NOT NULL,
  paired_effect double precision NOT NULL,
  control_adoption_rate double precision NOT NULL,
  treatment_adoption_rate double precision NOT NULL,
  validation jsonb NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  event_id text PRIMARY KEY,
  pair_id text NOT NULL REFERENCES paired_runs(pair_id) ON DELETE CASCADE,
  run_id text NOT NULL,
  branch_id text NOT NULL,
  tick integer NOT NULL,
  type text NOT NULL,
  event jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS events_pair_tick_idx ON events(pair_id, tick, event_id);
`;

export class PostgresRunStore implements RunStore {
  readonly #pool: Pool;

  constructor(databaseUrl: string) {
    this.#pool = new Pool({ connectionString: databaseUrl, max: 4 });
  }

  async migrate(): Promise<void> {
    await this.#pool.query(MIGRATION);
  }

  async close(): Promise<void> {
    await this.#pool.end();
  }

  async savePair(pair: StoredPair): Promise<void> {
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO paired_runs (
          pair_id, protocol_seed, protocol_hash, decision_mode, paired_effect,
          control_adoption_rate, treatment_adoption_rate, validation, result, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (pair_id) DO UPDATE SET
          protocol_seed = EXCLUDED.protocol_seed,
          protocol_hash = EXCLUDED.protocol_hash,
          decision_mode = EXCLUDED.decision_mode,
          paired_effect = EXCLUDED.paired_effect,
          control_adoption_rate = EXCLUDED.control_adoption_rate,
          treatment_adoption_rate = EXCLUDED.treatment_adoption_rate,
          validation = EXCLUDED.validation,
          result = EXCLUDED.result,
          created_at = EXCLUDED.created_at`,
        [
          pair.summary.pairId,
          pair.summary.protocolSeed,
          pair.summary.protocolHash,
          pair.summary.decisionMode,
          pair.summary.pairedEffect,
          pair.summary.controlAdoptionRate,
          pair.summary.treatmentAdoptionRate,
          JSON.stringify(pair.summary.validation),
          JSON.stringify(pair.result),
          pair.summary.createdAt,
        ],
      );
      await client.query("DELETE FROM events WHERE pair_id = $1", [pair.summary.pairId]);
      for (const event of [...pair.result.control.events, ...pair.result.treatment.events]) {
        await client.query(
          `INSERT INTO events (event_id, pair_id, run_id, branch_id, tick, type, event)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [event.eventId, pair.summary.pairId, event.runId, event.branchId, event.tick, event.type, JSON.stringify(event)],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getPair(pairId: string): Promise<StoredPair | null> {
    const result = await this.#pool.query<{
      pair_id: string;
      protocol_seed: string;
      protocol_hash: string;
      decision_mode: PairSummary["decisionMode"];
      paired_effect: number;
      control_adoption_rate: number;
      treatment_adoption_rate: number;
      validation: PairSummary["validation"];
      result: StoredPair["result"];
      created_at: Date;
    }>("SELECT * FROM paired_runs WHERE pair_id = $1", [pairId]);
    const row = result.rows[0];
    if (!row) return null;
    return {
      summary: {
        pairId: row.pair_id,
        protocolSeed: row.protocol_seed,
        protocolHash: row.protocol_hash,
        decisionMode: row.decision_mode,
        pairedEffect: row.paired_effect,
        controlAdoptionRate: row.control_adoption_rate,
        treatmentAdoptionRate: row.treatment_adoption_rate,
        validation: row.validation,
        createdAt: row.created_at.toISOString(),
      },
      result: row.result,
    };
  }

  async listPairs(): Promise<PairSummary[]> {
    const result = await this.#pool.query<{
      pair_id: string;
      protocol_seed: string;
      protocol_hash: string;
      decision_mode: PairSummary["decisionMode"];
      paired_effect: number;
      control_adoption_rate: number;
      treatment_adoption_rate: number;
      validation: PairSummary["validation"];
      created_at: Date;
    }>(`SELECT pair_id, protocol_seed, protocol_hash, decision_mode, paired_effect,
       control_adoption_rate, treatment_adoption_rate, validation, created_at
       FROM paired_runs ORDER BY created_at DESC`);
    return result.rows.map((row) => ({
      pairId: row.pair_id,
      protocolSeed: row.protocol_seed,
      protocolHash: row.protocol_hash,
      decisionMode: row.decision_mode,
      pairedEffect: row.paired_effect,
      controlAdoptionRate: row.control_adoption_rate,
      treatmentAdoptionRate: row.treatment_adoption_rate,
      validation: row.validation,
      createdAt: row.created_at.toISOString(),
    }));
  }
}
