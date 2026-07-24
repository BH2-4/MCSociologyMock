import type { ConsumerAgent, Relationship } from "./model.js";
import { SIMULATION_CONFIG } from "./model.js";

const SEED_INDEXES = new Set([0, 12]);

function rounded(value: number): number {
  return Number(value.toFixed(3));
}

export function createPopulation(): ConsumerAgent[] {
  return Array.from({ length: SIMULATION_CONFIG.consumerCount }, (_, index) => ({
    id: `consumer-${String(index + 1).padStart(2, "0")}`,
    index,
    communityId: `community-${Math.floor(index / 6) + 1}`,
    persona: `P${String(index + 1).padStart(2, "0")}: ${["pragmatic", "social", "skeptical", "curious"][index % 4]} consumer, cohort ${Math.floor(index / 4) + 1}`,
    isSeed: SEED_INDEXES.has(index),
    baselineTrust: rounded(0.34 + (index % 6) * 0.035 + index * 0.001),
    evidenceWeight: rounded(0.22 + (index % 5) * 0.025 + index * 0.001),
    productAffinity: rounded(0.43 + (index % 7) * 0.045 + index * 0.001),
    adoptionThreshold: rounded(0.64 + (index % 4) * 0.035 + index * 0.001),
    socialThreshold: rounded(0.58 + (index % 3) * 0.035 + index * 0.001),
    budgetMicros: 1_000_000 + (index % 6) * 100_000,
  }));
}

export function createFixedNetwork(agents: ConsumerAgent[]): Relationship[] {
  const edges: Relationship[] = [];
  const offsets = [1, 2, 3, 6];

  for (const source of agents) {
    for (const [offsetIndex, offset] of offsets.entries()) {
      const target = agents[(source.index + offset) % agents.length];
      edges.push({
        sourceId: source.id,
        targetId: target.id,
        trust: rounded(0.48 + ((source.index + target.index) % 6) * 0.06),
        familiarity: rounded(0.5 + ((source.index * 3 + target.index) % 5) * 0.07),
        contactProbability: offset === 6 ? 0.58 : rounded(0.72 + offsetIndex * 0.06),
        channel: offset === 1 || offset === 6 ? "CHAT" : "POST",
      });
    }
  }
  return edges;
}
