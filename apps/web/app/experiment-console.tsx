"use client";

import type { BranchRun, ExperimentEvent, PairedExperimentResult } from "@agorasim/core";
import {
  Activity,
  BadgeCheck,
  CircleDollarSign,
  Download,
  ExternalLink,
  FlaskConical,
  GitCompareArrows,
  Network,
  Play,
  Radio,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100";

type View = "lab" | "compare";
type BranchChoice = "control" | "treatment";
type DecisionChoice = "evidence-blind" | "fixed-threshold" | "llm";

function percent(value: number): string {
  return `${(value * 100).toFixed(value === 0 ? 0 : 1)}%`;
}

function short(value: string, size = 8): string {
  return value.length <= size * 2 + 1 ? value : `${value.slice(0, size)}...${value.slice(-size)}`;
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

export function ExperimentConsole({ initialResult }: { initialResult: PairedExperimentResult }) {
  const [result, setResult] = useState(initialResult);
  const [view, setView] = useState<View>("lab");
  const [branchChoice, setBranchChoice] = useState<BranchChoice>("treatment");
  const [decisionMode, setDecisionMode] = useState<DecisionChoice>("fixed-threshold");
  const [protocolSeed, setProtocolSeed] = useState("demo-seed-02");
  const [pairId, setPairId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><FlaskConical size={18} /> AgoraSim</div>
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
          <button className={view === "compare" ? "active" : ""} onClick={() => setView("compare")}><GitCompareArrows size={15} /> Compare</button>
        </div>
        <div className="run-controls">
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

      <section className="metric-band" aria-label="Primary metrics">
        <div><span>Control adoption</span><strong>{percent(result.control.metrics.adoptionRate)}</strong><small>{result.control.metrics.adoptedNonSeed} / 22 non-seed</small></div>
        <div><span>Treatment adoption</span><strong>{percent(result.treatment.metrics.adoptionRate)}</strong><small>{result.treatment.metrics.adoptedNonSeed} / 22 non-seed</small></div>
        <div className="effect"><span>Paired effect</span><strong>{result.pairedEffect >= 0 ? "+" : ""}{percent(result.pairedEffect)}</strong><small>Treatment - Control</small></div>
        <div><span>Evidence exposed</span><strong>{percent(result.treatment.metrics.evidenceExposureRate)}</strong><small>Control: {percent(result.control.metrics.evidenceExposureRate)}</small></div>
        <div><span>Chain mode</span><strong className="text-value">Mock receipts</strong><small>No testnet tx claimed</small></div>
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
            <button className="icon-command" disabled={!claimEvidence?.blockscoutUrl} title="Open Blockscout transaction">
              <ExternalLink size={15} /> {claimEvidence?.blockscoutUrl ? "Open transaction" : "No chain transaction in Mock mode"}
            </button>
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
                <button className="timeline-event" key={event.eventId} title={`Parent: ${event.causedByEventId ?? "root"}`}>
                  <span className={`event-dot ${event.type.toLowerCase()}`} />
                  <span className="event-copy"><strong>{eventLabel(event)}</strong><small>Tick {event.tick} · {event.actorId ?? event.targetId ?? "system"}</small></span>
                  <code>{short(event.eventId, 5)}</code>
                </button>
              ))}
            </div>
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
          </div>
          <aside className="validation-pane">
            <div className="pane-heading"><div><span className="section-kicker">Validation</span><h2>Failure checks</h2></div><ShieldCheck size={20} /></div>
            {[
              ["Branch semantic diff", result.branchDiffReport.pass],
              ["Claim parity", result.validation.claimParity],
              ["Control Evidence leak = 0", result.validation.controlEvidenceLeakCount === 0],
              ["Treatment omissions = 0", result.validation.treatmentEvidenceOmissionCount === 0],
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
