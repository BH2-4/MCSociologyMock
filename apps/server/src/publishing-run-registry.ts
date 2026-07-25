import {
  createPublicProxyObservation,
  createPublishingReport,
  type PublicProxyObservation,
  type PublicProxyObservationInput,
  type PublishingPairResult,
  type PublishingReport,
} from "@gesellschaft/core";

export interface PublishingRunRecord {
  result: PublishingPairResult;
  observations: readonly PublicProxyObservation[];
}

export class PublishingRunRegistry {
  readonly #records = new Map<string, PublishingRunRecord>();

  constructor(readonly capacity = 16) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new Error("PUBLISHING_REGISTRY_CAPACITY_INVALID");
  }

  save(pairId: string, result: PublishingPairResult): PublishingRunRecord {
    const existing = this.#records.get(pairId);
    if (existing) return existing;
    if (this.#records.size >= this.capacity) {
      const oldestPairId = this.#records.keys().next().value as string | undefined;
      if (oldestPairId) this.#records.delete(oldestPairId);
    }
    const record = Object.freeze({ result, observations: Object.freeze([]) });
    this.#records.set(pairId, record);
    return record;
  }

  get(pairId: string): PublishingRunRecord | undefined {
    return this.#records.get(pairId);
  }

  appendObservation(
    pairId: string,
    input: PublicProxyObservationInput,
    now: Date = new Date(),
  ): PublishingReport {
    const current = this.#records.get(pairId);
    if (!current) throw new Error("PUBLISHING_PAIR_NOT_FOUND");
    const observation = createPublicProxyObservation(input, now);
    if (current.observations.some((item) => item.contentHash === observation.contentHash)) {
      throw new Error("DUPLICATE_POSTLAUNCH_OBSERVATION");
    }
    const next = Object.freeze({
      result: current.result,
      observations: Object.freeze([...current.observations, observation]),
    });
    this.#records.set(pairId, next);
    return createPublishingReport(next.result, next.observations);
  }

  report(pairId: string): PublishingReport | undefined {
    const record = this.#records.get(pairId);
    return record ? createPublishingReport(record.result, record.observations) : undefined;
  }
}
