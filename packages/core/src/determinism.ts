import { createHash } from "node:crypto";

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalValue(entry)]),
    );
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalValue(value));
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashObject(value: unknown): string {
  return sha256(canonicalJson(value));
}

export function keyedRandom(
  protocolSeed: string,
  tick: number,
  logicalAgentId: string,
  drawType: string,
): number {
  const digest = sha256(`${protocolSeed}:${tick}:${logicalAgentId}:${drawType}`);
  return Number.parseInt(digest.slice(0, 13), 16) / 0xfffffffffffff;
}

export function deterministicAddress(namespace: string, logicalAgentId: string): `0x${string}` {
  return `0x${sha256(`${namespace}:${logicalAgentId}`).slice(0, 40)}`;
}
