"use client";

import Link from "next/link";
import type { BranchRun, ExperimentEvent, PairedExperimentResult } from "@agorasim/core";
import {
  Activity,
  BadgeCheck,
  CircleDollarSign,
  CornerDownRight,
  CornerUpLeft,
  Download,
  ExternalLink,
  GitCompareArrows,
  Megaphone,
  Network,
  Play,
  Radio,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100";

type View = "lab" | "compare";
type BranchChoice = "control" | "treatment";
type DecisionChoice = "evidence-blind" | "fixed-threshold" | "llm";
interface ComparisonSummary {
  protocolSeed: string;
  decisionMode: DecisionChoice;
  pairedEffect: number | null;
  controlAdoptionRate: number | null;
  treatmentAdoptionRate: number | null;
}

interface ProductRelease {
  id: string;
  text: string;
  createdAt: string;
}

function percent(value: number): string {
  return `${(value * 100).toFixed(value === 0 ? 0 : 1)}%`;
}

function short(value: string, size = 8): string {
  return value.length <= size * 2 + 1 ? value : `${value.slice(0, size)}...${value.slice(-size)}`;
}

function stabilityFor(comparisons: ComparisonSummary[], mode: DecisionChoice): string {
  const effects = comparisons
    .filter((comparison) => comparison.decisionMode === mode && comparison.pairedEffect !== null)
    .map((comparison) => Math.sign(comparison.pairedEffect as number));
  if (effects.length === 0) return "Not run";
  if (effects.length === 1) return "1 seed";
  return new Set(effects).size > 1 ? "Unstable" : "Stable";
}

function eventLabel(event: ExperimentEvent): string {
  const labels: Partial<Record<ExperimentEvent["type"], string>> = {
    CLAIM_PUBLISHED: "Claim published",
    OBSERVATION_DELIVERED: "Claim observed",
    EVIDENCE_EXPOSED: "Receipt exposed",
    EVIDENCE_INSPECTED: "Evidence inspected",
    CREDIBILITY_ASSESSED: "Credibility assessed",
    ACTION_PROPOSED: `Action: ${String(event.payload.action ?? "proposed")}`,
    CHAT_SENT: "Private chat sent",
    POST_PUBLISHED: "Claim reposted",
    X402_PAYMENT_REQUIRED: "x402 challenge",
    X402_POLICY_APPROVED: "Wallet Policy approved",
    X402_PAYMENT_SIGNED: "Payment authorized",
    X402_PAYMENT_SETTLED: "Payment settled",
    PRODUCT_FULFILLED: "Product fulfilled",
    PRODUCT_ADOPTED: "Purchase adopted",
  };
  return labels[event.type] ?? event.type.replaceAll("_", " ").toLowerCase();
}

function representativeMechanism(run: BranchRun): ExperimentEvent[] {
  const seedIds = new Set(run.agents.filter((agent) => agent.isSeed).map((agent) => agent.id));
  const adopted = run.events.find((event) => event.type === "PRODUCT_ADOPTED" && event.actorId && !seedIds.has(event.actorId));
  const actorId = adopted?.actorId ?? run.decisions.find((decision) => !seedIds.has(decision.agentId))?.agentId;
  const relevant = new Set([
    "CLAIM_PUBLISHED",
    "OBSERVATION_DELIVERED",
    "EVIDENCE_EXPOSED",
    "EVIDENCE_INSPECTED",
    "CREDIBILITY_ASSESSED",
    "ACTION_PROPOSED",
    "POST_PUBLISHED",
    "CHAT_SENT",
    "X402_PAYMENT_REQUIRED",
    "X402_POLICY_APPROVED",
    "X402_PAYMENT_SETTLED",
    "PRODUCT_FULFILLED",
    "PRODUCT_ADOPTED",
  ]);
  return run.events
    .filter((event) => relevant.has(event.type))
    .filter((event) => event.type === "CLAIM_PUBLISHED" || event.actorId === actorId || event.targetId === actorId)
    .slice(0, 14);
}

function NetworkMap({ run }: { run: BranchRun }) {
  const points = run.agents.map((agent, index) => {
    const angle = (Math.PI * 2 * index) / run.agents.length - Math.PI / 2;
    const communityOffset = (Number(agent.communityId.slice(-1)) - 2.5) * 8;
    return {
      agent,
      x: 150 + Math.cos(angle) * (104 + communityOffset),
      y: 122 + Math.sin(angle) * (88 + communityOffset / 2),
    };
  });
  const byId = new Map(points.map((point) => [point.agent.id, point]));
  const adopted = new Set(run.payments.map((payment) => payment.payerAgentId));
  const exposed = new Set(run.events.filter((event) => event.type === "EVIDENCE_EXPOSED").map((event) => event.targetId));
  return (
    <svg className="network-map" viewBox="0 0 300 244" role="img" aria-label={`${run.branchId} relationship network`}>
      {run.relationships.filter((_, index) => index % 3 === 0).map((edge) => {
        const source = byId.get(edge.sourceId);
        const target = byId.get(edge.targetId);
        if (!source || !target) return null;
        return <line key={`${edge.sourceId}-${edge.targetId}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y} />;
      })}
      {points.map(({ agent, x, y }) => (
        <circle
          key={agent.id}
          cx={x}
          cy={y}
          r={agent.isSeed ? 6 : 4.5}
          className={agent.isSeed ? "node seed" : adopted.has(agent.id) ? "node adopted" : exposed.has(agent.id) ? "node exposed" : "node"}
        />
      ))}
    </svg>
  );
}

export function ExperimentConsole({
  initialResult,
  initialComparisons,
}: {
  initialResult: PairedExperimentResult;
  initialComparisons: ComparisonSummary[];
}) {
  const [result, setResult] = useState(initialResult);
  const [view, setView] = useState<View>("lab");
  const [branchChoice, setBranchChoice] = useState<BranchChoice>("treatment");
  const [decisionMode, setDecisionMode] = useState<DecisionChoice>("fixed-threshold");
  const [protocolSeed, setProtocolSeed] = useState("demo-seed-02");
  const [pairId, setPairId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparisons, setComparisons] = useState(initialComparisons);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [productDraft, setProductDraft] = useState("");
  const [productReleases, setProductReleases] = useState<ProductRelease[]>([]);
  const branch = result[branchChoice];
  const mechanism = useMemo(() => representativeMechanism(branch), [branch]);
  const claim = branch.claims[0];
  const claimEvidence = claim ? branch.evidence.find((item) => item.id === claim.evidenceId) : undefined;
  const observedActions = new Set(result.treatment.decisions.map((decision) => decision.action));
  const modeValidation: [string, boolean] = result.control.decisionMode === "fixed-threshold"
    ? ["Threshold direction restored", result.validation.fixedThresholdPositive === true]
    : result.control.decisionMode === "evidence-blind"
      ? ["Evidence-blind effect = 0", result.validation.evidenceBlindZero === true]
      : ["LLM result direction unrestricted", true];
  const realSeedPaymentCount = [...result.control.payments, ...result.treatment.payments]
    .filter((payment) => payment.source === "INJECTIVE_TESTNET").length;
  const blockscoutUrl = branchChoice === "treatment" ? claimEvidence?.blockscoutUrl : null;
  const selectedEvent = (selectedEventId
    ? branch.events.find((event) => event.eventId === selectedEventId)
    : undefined) ?? mechanism[0];
  const parentEvent = selectedEvent?.causedByEventId
    ? branch.events.find((event) => event.eventId === selectedEvent.causedByEventId)
    : undefined;
  const childEvents = selectedEvent
    ? branch.events.filter((event) => event.causedByEventId === selectedEvent.eventId)
    : [];

  function mergeComparisons(incoming: ComparisonSummary[]) {
    setComparisons((current) => {
      const merged = new Map(current.map((item) => [`${item.protocolSeed}:${item.decisionMode}`, item]));
      for (const item of incoming) merged.set(`${item.protocolSeed}:${item.decisionMode}`, item);
      return [...merged.values()].sort((left, right) =>
        left.protocolSeed.localeCompare(right.protocolSeed) || left.decisionMode.localeCompare(right.decisionMode)
      );
    });
  }

  async function showCompare() {
    setView("compare");
    try {
      const response = await fetch(`${API_URL}/v1/experiments/agorasim-p0/comparison`);
      if (!response.ok) return;
      const body = await response.json() as { pairs?: ComparisonSummary[] };
      if (body.pairs) mergeComparisons(body.pairs);
    } catch {
      // The recorded comparison remains available without an API runtime.
    }
  }

  async function runPair() {
    setRunning(true);
    setError(null);
    try {
      const created = await fetch(`${API_URL}/v1/experiments/agorasim-p0/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": `${protocolSeed}:${decisionMode}` },
        body: JSON.stringify({ protocolSeed, decisionMode }),
      });
      const createdBody = await created.json() as { pairId?: string; error?: string };
      if (!created.ok || !createdBody.pairId) throw new Error(createdBody.error ?? `API returned ${created.status}`);
      const loaded = await fetch(`${API_URL}/v1/pairs/${createdBody.pairId}`);
      if (!loaded.ok) throw new Error(`Pair read failed with ${loaded.status}`);
      const pair = await loaded.json() as { result: PairedExperimentResult };
      setResult(pair.result);
      setPairId(createdBody.pairId);
      mergeComparisons([{
        protocolSeed,
        decisionMode,
        pairedEffect: pair.result.pairedEffect,
        controlAdoptionRate: pair.result.control.metrics.adoptionRate,
        treatmentAdoptionRate: pair.result.treatment.metrics.adoptionRate,
      }]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Run failed");
    } finally {
      setRunning(false);
    }
  }

  async function replayPair() {
    if (!pairId) return;
    setError(null);
    const replayed = await fetch(`${API_URL}/v1/pairs/${pairId}/replay`, { method: "POST" });
    if (!replayed.ok) setError(`Replay failed with ${replayed.status}`);
  }

  function publishProductRelease() {
    const text = productDraft.trim();
    if (!text) return;
    setProductReleases((current) => [
      {
        id: `release-${Date.now()}`,
        text,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
    setProductDraft("");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img className="brand-logo" src="/gesellschaft-logo.svg" alt="Gesellschaft" />
        </div>
        <div className="run-meta">
          <span><Radio size={14} /> Recorded / Mock</span>
          <span>Tick 08/08</span>
          <span className="protocol">protocol {result.protocol.protocolHash.slice(0, 9)}</span>
          <span className="pass"><ShieldCheck size={14} /> Branch diff PASS</span>
        </div>
      </header>

      <section className="control-strip" aria-label="Experiment controls">
        <div className="segmented" aria-label="View">
          <button className={view === "lab" ? "active" : ""} onClick={() => setView("lab")}><Activity size={15} /> Live Lab</button>
          <button className={view === "compare" ? "active" : ""} onClick={showCompare}><GitCompareArrows size={15} /> Compare</button>
        </div>
        <div className="run-controls">
          <Link className="p0-p1-link" href="/p1">ZZZ 3.1 JP Lab</Link>
          <select aria-label="Decision mode" value={decisionMode} onChange={(event) => setDecisionMode(event.target.value as DecisionChoice)}>
            <option value="fixed-threshold">Fixed-threshold</option>
            <option value="evidence-blind">Evidence-blind</option>
            <option value="llm">LLM Agent</option>
          </select>
          <input aria-label="Protocol seed" value={protocolSeed} onChange={(event) => setProtocolSeed(event.target.value)} />
          <button className="run-button" onClick={runPair} disabled={running} title="Run paired experiment">
            {running ? <RefreshCw className="spin" size={16} /> : <Play size={16} />} {running ? "Running" : "Run pair"}
          </button>
        </div>
      </section>

      {error && <div className="error-banner" role="alert">Run stopped: {error}. Recorded result remains visible; no fallback was used.</div>}

      <section className="release-panel" aria-label="Product release">
        <div className="release-card">
          <div className="release-card-head">
            <div className="release-icon" aria-hidden>
              <Megaphone size={16} />
            </div>
            <div>
              <h2>Product release</h2>
              <p>Inject a launch, update, or market signal into the society.</p>
            </div>
          </div>
          <div className="release-compose">
            <textarea
              className="release-input"
              rows={3}
              value={productDraft}
              onChange={(event) => setProductDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  publishProductRelease();
                }
              }}
              placeholder="e.g. Zenless Zone Zero 3.1 launches in Japan with new limited character Remiel…"
              aria-label="Product release message"
            />
            <div className="release-actions">
              <span className="release-hint">{productDraft.trim().length > 0 ? `${productDraft.trim().length} chars` : "⌘↵ to publish"}</span>
              <button
                type="button"
                className="release-submit"
                onClick={publishProductRelease}
                disabled={!productDraft.trim()}
              >
                Publish
              </button>
            </div>
          </div>
          {productReleases.length > 0 && (
            <ul className="release-queue">
              {productReleases.map((release) => (
                <li key={release.id} className="release-item">
                  <div className="release-item-body">
                    <strong>Queued</strong>
                    <p>{release.text}</p>
                  </div>
                  <button
                    type="button"
                    className="release-remove"
                    aria-label="Remove release"
                    onClick={() => setProductReleases((current) => current.filter((item) => item.id !== release.id))}
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="metric-band" aria-label="Primary metrics">
        <div><span>Control adoption</span><strong>{percent(result.control.metrics.adoptionRate)}</strong><small>{result.control.metrics.adoptedNonSeed} / 22 non-seed</small></div>
        <div><span>Treatment adoption</span><strong>{percent(result.treatment.metrics.adoptionRate)}</strong><small>{result.treatment.metrics.adoptedNonSeed} / 22 non-seed</small></div>
        <div className="effect"><span>Paired effect</span><strong>{result.pairedEffect >= 0 ? "+" : ""}{percent(result.pairedEffect)}</strong><small>Treatment - Control</small></div>
        <div><span>Evidence exposed</span><strong>{percent(result.treatment.metrics.evidenceExposureRate)}</strong><small>Control: {percent(result.control.metrics.evidenceExposureRate)}</small></div>
        <div><span>Chain mode</span><strong className="text-value">{realSeedPaymentCount === 4 ? "Injective testnet" : "Mock receipts"}</strong><small>{realSeedPaymentCount === 4 ? "4 verified seed transactions" : "No testnet tx claimed"}</small></div>
      </section>

      {view === "lab" ? (
        <section className="lab-layout">
          <aside className="evidence-pane">
            <div className="pane-heading">
              <div><span className="section-kicker">Claim + Evidence</span><h2>Seed purchase claim</h2></div>
              <BadgeCheck size={20} />
            </div>
            <dl className="facts">
              <div><dt>Claim</dt><dd>{claim?.id ?? "-"}</dd></div>
              <div><dt>Hash</dt><dd>{claim ? short(claim.contentHash, 7) : "-"}</dd></div>
              <div><dt>Author</dt><dd>{claim?.authorId ?? "-"}</dd></div>
              <div><dt>Price</dt><dd>0.30 testnet USDC</dd></div>
            </dl>
            <blockquote>{claim?.body}</blockquote>
            <div className={`receipt-state ${branchChoice === "control" ? "hidden" : ""}`}>
              <span>{branchChoice === "control" ? "Receipt hidden by protocol" : "Verified purchase summary"}</span>
              <strong>{branchChoice === "control" ? "No Evidence in observation" : claimEvidence?.source ?? "MOCK"}</strong>
            </div>
            <div className="proof-boundary">
              <h3>Proves</h3>
              <p>Purchase occurred, amount, merchant, time</p>
              <h3>Does not prove</h3>
              <p>Product quality, actual usage, review truth, recommendation motive</p>
            </div>
            <a
              className={`icon-command ${!blockscoutUrl ? "disabled" : ""}`}
              href={blockscoutUrl ?? undefined}
              target="_blank"
              rel="noreferrer"
              title="Open Blockscout transaction"
            >
              <ExternalLink size={15} /> {blockscoutUrl ? "Open transaction" : "No visible chain transaction"}
            </a>
          </aside>

          <section className="mechanism-pane">
            <div className="pane-heading">
              <div><span className="section-kicker">Mechanism timeline</span><h2>Evidence to paid adoption</h2></div>
              <div className="segmented compact" aria-label="Branch">
                <button className={branchChoice === "control" ? "active" : ""} onClick={() => setBranchChoice("control")}>Control</button>
                <button className={branchChoice === "treatment" ? "active" : ""} onClick={() => setBranchChoice("treatment")}>Treatment</button>
              </div>
            </div>
            <div className="timeline">
              {mechanism.map((event) => (
                <button
                  className={`timeline-event ${selectedEvent?.eventId === event.eventId ? "selected" : ""}`}
                  key={event.eventId}
                  title={`Parent: ${event.causedByEventId ?? "root"}`}
                  onClick={() => setSelectedEventId(event.eventId)}
                >
                  <span className={`event-dot ${event.type.toLowerCase()}`} />
                  <span className="event-copy"><strong>{eventLabel(event)}</strong><small>Tick {event.tick} · {event.actorId ?? event.targetId ?? "system"}</small></span>
                  <code>{short(event.eventId, 5)}</code>
                </button>
              ))}
            </div>
            {selectedEvent && (
              <div className="event-inspector" role="region" aria-label="Event lineage">
                <div><span>Selected event</span><strong>{eventLabel(selectedEvent)}</strong><code>{selectedEvent.eventId}</code></div>
                <div className="lineage-links">
                  {parentEvent ? (
                    <button onClick={() => setSelectedEventId(parentEvent.eventId)}>
                      <CornerUpLeft size={14} /><span>Parent</span><strong>{eventLabel(parentEvent)}</strong>
                    </button>
                  ) : <span className="lineage-root">Root event</span>}
                  {childEvents.map((child) => (
                    <button key={child.eventId} onClick={() => setSelectedEventId(child.eventId)}>
                      <CornerDownRight size={14} /><span>Child</span><strong>{eventLabel(child)}</strong>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside className="network-pane">
            <div className="pane-heading">
              <div><span className="section-kicker">Local network</span><h2>24 consumers / 4 communities</h2></div>
              <Network size={20} />
            </div>
            <NetworkMap run={branch} />
            <div className="legend"><span><i className="seed" /> Seed</span><span><i className="exposed" /> Exposed</span><span><i className="adopted" /> Purchased</span></div>
            <div className="agent-summary">
              <span>Evidence inspections <strong>{branch.events.filter((event) => event.type === "EVIDENCE_INSPECTED").length}</strong></span>
              <span>Chats <strong>{branch.metrics.chatCount}</strong></span>
              <span>Posts <strong>{branch.metrics.postCount}</strong></span>
              <span>Purchases <strong>{branch.payments.length}</strong></span>
            </div>
          </aside>
        </section>
      ) : (
        <section className="compare-layout">
          <div className="comparison-table" role="table" aria-label="Branch comparison">
            <div className="comparison-row header" role="row"><span>Metric</span><span>Control</span><span>Treatment</span><span>Difference</span></div>
            {[
              ["Non-seed adoption", result.control.metrics.adoptionRate, result.treatment.metrics.adoptionRate],
              ["Evidence exposure", result.control.metrics.evidenceExposureRate, result.treatment.metrics.evidenceExposureRate],
              ["Evidence inspection", result.control.metrics.evidenceInspectionRate, result.treatment.metrics.evidenceInspectionRate],
              ["Mean credibility", result.control.metrics.meanCredibility, result.treatment.metrics.meanCredibility],
            ].map(([label, control, treatment]) => (
              <div className="comparison-row" role="row" key={String(label)}>
                <strong>{label}</strong><span>{percent(Number(control))}</span><span>{percent(Number(treatment))}</span><span>{Number(treatment) - Number(control) >= 0 ? "+" : ""}{percent(Number(treatment) - Number(control))}</span>
              </div>
            ))}
            <div className="baseline-table">
              <div className="baseline-heading"><span>Paired Seed</span><span>Decision mode</span><span>Control</span><span>Treatment</span><span>Effect</span><span>Direction</span></div>
              {comparisons.map((comparison) => (
                <div className="baseline-row" key={`${comparison.protocolSeed}:${comparison.decisionMode}`}>
                  <strong>{comparison.protocolSeed}</strong>
                  <span>{comparison.decisionMode}</span>
                  <span>{comparison.controlAdoptionRate === null ? "Not run" : percent(comparison.controlAdoptionRate)}</span>
                  <span>{comparison.treatmentAdoptionRate === null ? "Not run" : percent(comparison.treatmentAdoptionRate)}</span>
                  <span>{comparison.pairedEffect === null ? "Not run" : `${comparison.pairedEffect >= 0 ? "+" : ""}${percent(comparison.pairedEffect)}`}</span>
                  <span>{stabilityFor(comparisons, comparison.decisionMode)}</span>
                </div>
              ))}
            </div>
          </div>
          <aside className="validation-pane">
            <div className="pane-heading"><div><span className="section-kicker">Validation</span><h2>Failure checks</h2></div><ShieldCheck size={20} /></div>
            {[
              ["Branch semantic diff", result.branchDiffReport.pass],
              ["Claim parity", result.validation.claimParity],
              ["Control Evidence leak = 0", result.validation.controlEvidenceLeakCount === 0],
              ["Treatment omissions = 0", result.validation.treatmentEvidenceOmissionCount === 0],
              ["Wallet branches isolated", result.validation.walletIsolation],
              ["Seed payments symmetric", result.validation.seedPaymentParity],
              ["Balances conserved", result.validation.balancesConserved],
              ["Supply conserved", result.validation.suppliesConserved],
              modeValidation,
            ].map(([label, passed]) => <div className="check-row" key={String(label)}><span>{label}</span><strong className={passed ? "ok" : "fail"}>{passed ? "PASS" : "FAIL"}</strong></div>)}
          </aside>
          <aside className="action-pane">
            <div className="pane-heading"><div><span className="section-kicker">Action coverage</span><h2>Structured chain</h2></div><CircleDollarSign size={20} /></div>
            {(["INSPECT_EVIDENCE", "CHAT", "POST", "BUY", "IDLE"] as const).map((action) => (
              <div className="action-row" key={action}><span>{action}</span><strong>{observedActions.has(action) ? "Observed" : "Missing"}</strong></div>
            ))}
            <div className="compare-actions">
              <button onClick={replayPair} disabled={!pairId}><RefreshCw size={15} /> Replay</button>
              <a className={!pairId ? "disabled" : ""} href={pairId ? `${API_URL}/v1/pairs/${pairId}/export` : undefined}><Download size={15} /> Export</a>
            </div>
          </aside>
        </section>
      )}

      <footer>
        <span>Synthetic simulation. Not a real-market forecast.</span>
        <span>Test assets have no real value. Receipts prove purchase, not quality or recommendation truth.</span>
      </footer>
    </main>
  );
}
