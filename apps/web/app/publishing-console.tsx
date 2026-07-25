"use client";

import Link from "next/link";
import {
  BookOpenCheck,
  Check,
  Clock3,
  Compass,
  Database,
  Download,
  FlaskConical,
  GitBranch,
  LineChart,
  Play,
  RotateCcw,
  ShieldCheck,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useState } from "react";

import {
  type PublishingPairResult,
  type PublishingReplayResult,
  type PublishingReport,
} from "@agorasim/core";

type Workspace = "market" | "audience" | "strategy" | "outcome";

const WORKSPACES: Array<{ id: Workspace; label: string; icon: typeof Compass }> = [
  { id: "market", label: "Market Fit", icon: Compass },
  { id: "audience", label: "Audience Map", icon: UsersRound },
  { id: "strategy", label: "Strategy Lab", icon: FlaskConical },
  { id: "outcome", label: "Outcome & Calibration", icon: LineChart },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100";

function signed(value: number): string {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function percent(value: number): string {
  return `${(value * 100).toFixed(value === 0 ? 0 : 1)}%`;
}

function short(value: string, size = 8): string {
  return value.length <= size * 2 + 1 ? value : `${value.slice(0, size)}...${value.slice(-size)}`;
}

export function PublishingConsole({ initialResult, initialReport }: { initialResult: PublishingPairResult; initialReport: PublishingReport }) {
  const [result, setResult] = useState(initialResult);
  const [report, setReport] = useState(initialReport);
  const [workspace, setWorkspace] = useState<Workspace>("market");
  const [running, setRunning] = useState(false);
  const [replay, setReplay] = useState<PublishingReplayResult | null>(null);
  const [pairId, setPairId] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<"control" | "treatment">("control");
  const [error, setError] = useState<string | null>(null);
  const branch = result[selectedBranch];
  const agents = result.control.agents;
  const segments = [...new Set(agents.map((agent) => agent.segment))];

  async function run(seed: string, agentCount: number) {
    setRunning(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/v1/experiments/zzz-3.1-jp/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protocolSeed: seed, agentCount }),
      });
      const body = await response.json() as { pairId?: string; result?: PublishingPairResult; report?: PublishingReport; error?: string };
      if (!response.ok || !body.pairId || !body.result || !body.report) throw new Error(body.error ?? `P1 API returned ${response.status}`);
      setPairId(body.pairId);
      setResult(body.result);
      setReport(body.report);
      setReplay(null);
      setWorkspace("strategy");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "P1 run failed");
    } finally {
      setRunning(false);
    }
  }

  async function replayCurrent() {
    setError(null);
    try {
      if (!pairId) throw new Error("Run a P1 pair in this API session before Replay.");
      const response = await fetch(`${API_URL}/v1/experiments/zzz-3.1-jp/replay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairId }),
      });
      const body = await response.json() as { replay?: PublishingReplayResult; error?: string };
      if (!response.ok || !body.replay) throw new Error(body.error ?? `P1 Replay returned ${response.status}`);
      setReplay(body.replay);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "P1 Replay failed");
    }
  }

  function downloadReport() {
    const payload = JSON.stringify({ report, result }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `zzz-3.1-jp-${result.protocol.protocolSeed}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="publishing-shell">
      <header className="publishing-topbar">
        <div className="publishing-brand"><img src="/gesellschaft-logo.svg" alt="Gesellschaft" /><span>P1 / ZZZ 3.1 JP</span></div>
        <div className="publishing-meta"><span><Clock3 size={14} /> Pre-launch snapshot</span><span className="status-waiting">Awaiting T+72h</span><Link href="/" className="p1-back-link">P0 Lab</Link></div>
      </header>

      <section className="case-header">
        <div>
          <span className="eyebrow">AI GLOBAL PUBLISHING DECISION LAB</span>
          <h1>《绝区零》Ver.3.1 / 蕾米埃尔 / 日本</h1>
          <p>固定公开事实，比较首屏信息的表达重心。当前结果是合成实验，不是现实流水预测。</p>
        </div>
        <div className="case-facts">
          <div><span>Release</span><strong>2026-07-29 JST</strong></div>
          <div><span>Population</span><strong>24 agents / 8 ticks</strong></div>
          <div><span>Protocol</span><code>{short(result.protocol.protocolHash)}</code></div>
        </div>
      </section>

      <nav className="workspace-nav" aria-label="P1 workspaces">
        {WORKSPACES.map(({ id, label, icon: Icon }) => (
          <button key={id} className={workspace === id ? "active" : ""} onClick={() => setWorkspace(id)}>
            <Icon size={16} /> <span>{label}</span>
          </button>
        ))}
      </nav>

      {error && <div className="publishing-error" role="alert">{error}</div>}

      {workspace === "market" && (
        <section className="workspace-grid market-grid">
          <article className="panel panel-wide">
            <div className="panel-heading"><div><span className="eyebrow">SOURCE BUNDLE</span><h2>日本 3.1 事实快照</h2></div><Database size={20} /></div>
            <div className="snapshot-row"><span>Snapshot</span><code>{result.snapshot.snapshotId}</code><span className="chip chip-green"><Check size={13} /> Immutable</span></div>
            <div className="source-list">
              {result.snapshot.sources.map((source) => (
                <div className="source-item" key={source.sourceId}>
                  <div><strong>{source.sourceId}</strong><span>{source.sourceTier}</span></div>
                  <p>{source.title}</p>
                  <small>{source.platformScope.join(" · ")} · {source.publishedAt}</small>
                  <code>{short(source.contentHash, 10)}</code>
                </div>
              ))}
            </div>
          </article>
          <article className="panel">
            <div className="panel-heading"><div><span className="eyebrow">MARKET FIT</span><h2>机会与阻力</h2></div><Compass size={20} /></div>
            <div className="bullet-group"><h3>机会</h3>{["日本官方内容面可观测", "战斗、角色、外观动机可分离", "42 天版本窗口固定"].map((item) => <p key={item}><Check size={14} />{item}</p>)}</div>
            <div className="bullet-group"><h3>数据缺口</h3>{result.snapshot ? ["无公开随机发行分支", "无单角色官方收入", "移动榜单不覆盖全平台"].map((item) => <p key={item}><ShieldCheck size={14} />{item}</p>) : null}</div>
          </article>
          <article className="panel panel-wide">
            <div className="panel-heading"><div><span className="eyebrow">HISTORICAL ANALOGS</span><h2>日本 iOS 序数窗口</h2></div><LineChart size={20} /></div>
            <div className="analog-table">
              <div className="analog-row analog-head"><span>事件</span><span>前日</span><span>上线日</span><span>次日最佳</span><span>Game-i</span></div>
              {result.snapshot.historicalAnalogs.map((analog) => <div className="analog-row" key={analog.id}><strong>{analog.character} / {analog.version}</strong><span>{analog.previousDayRank}</span><span>{analog.launchDayRank}</span><span>{analog.nextDayBestRank}</span><small>{analog.monthlyEstimateLabel}</small></div>)}
            </div>
            <p className="panel-note">榜单是序数观测；Game-i 为第三方粗估，不能当作米哈游披露收入，也不能拟合蕾米埃尔单角色流水。</p>
          </article>
        </section>
      )}

      {workspace === "audience" && (
        <section className="workspace-grid audience-grid">
          <article className="panel panel-wide">
            <div className="panel-heading"><div><span className="eyebrow">AUDIENCE MAP</span><h2>日本内部合成人群</h2></div><UsersRound size={20} /></div>
            <div className="segment-grid">
              {segments.map((segment) => {
                const group = agents.filter((agent) => agent.segment === segment);
                const avgBudget = group.reduce((sum, agent) => sum + agent.pullBudget, 0) / group.length;
                return <div className="segment-card" key={segment}><span>{segment}</span><strong>{group.length} agents</strong><small>平均 synthetic budget {Math.round(avgBudget)}</small><small>{group[0]?.platformPreference} / {group[0]?.activityStatus}</small></div>;
              })}
            </div>
          </article>
          <article className="panel">
            <div className="panel-heading"><div><span className="eyebrow">PARAMETERS</span><h2>可导出来源</h2></div><BookOpenCheck size={20} /></div>
            {[
              ["activity / platform", "PREREGISTERED_ASSUMPTION"],
              ["spend propensity", "HISTORICAL_CALIBRATION"],
              ["combat / affinity", "ENGINEERING_DEFAULT"],
              ["source trust", "ENGINEERING_DEFAULT"],
            ].map(([label, source]) => <div className="parameter-row" key={label}><span>{label}</span><code>{source}</code></div>)}
            <p className="panel-note">分层是模型内部的分析切片，不代表“日本玩家普遍如此”。</p>
          </article>
          <article className="panel panel-wide audience-table-panel">
            <div className="panel-heading"><div><span className="eyebrow">AGENT STATES</span><h2>前 12 个状态摘要</h2></div><GitBranch size={20} /></div>
            <div className="agent-table"><div className="agent-row agent-head"><span>Agent</span><span>Segment</span><span>Platform</span><span>Affinity</span><span>Budget</span><span>Provenance</span></div>{agents.slice(0, 12).map((agent) => <div className="agent-row" key={agent.id}><code>{agent.id}</code><span>{agent.segment}</span><span>{agent.platformPreference}</span><span>{agent.characterAffinity.toFixed(2)}</span><span>{agent.pullBudget}</span><small>{agent.provenance.characterAffinity}</small></div>)}</div>
          </article>
        </section>
      )}

      {workspace === "strategy" && (
        <section className="workspace-grid strategy-grid">
          <article className="panel strategy-controls">
            <div className="panel-heading"><div><span className="eyebrow">STRATEGY LAB</span><h2>单变量配对运行</h2></div><FlaskConical size={20} /></div>
            <div className="strategy-choice"><div><span className="strategy-tag combat">CONTROL</span><strong>COMBAT_VALUE_FIRST</strong><small>定位、机制、队伍适配先行</small></div><div><span className="strategy-tag affinity">TREATMENT</span><strong>CHARACTER_AFFINITY_FIRST</strong><small>人设、关系、剧情表达先行</small></div></div>
            <div className="run-buttons"><button onClick={() => run("zzz-jp-smoke-01", 4)} disabled={running}><Play size={15} /> {running ? "Running" : "4-agent smoke"}</button><button onClick={() => run("zzz-jp-seed-01", 24)} disabled={running}><Play size={15} /> 24-agent paired run</button></div>
            <div className="gate-list">{[
              ["Localization Gate", result.localizationGate.pass],
              ["Branch diff", result.branchDiffReport.pass],
              ["Population parity", result.validation.populationParity],
              ["Network parity", result.validation.networkParity],
              ["Ledger conservation", result.validation.ledgerConserved],
            ].map(([label, pass]) => <div key={String(label)}><span>{label}</span><strong className={pass ? "pass" : "fail"}>{pass ? "PASS" : "FAIL"}</strong></div>)}</div>
          </article>
          <article className="panel metric-panel">
            <div className="panel-heading"><div><span className="eyebrow">PRIMARY METRIC</span><h2>合成蕾米埃尔支出</h2></div><WalletCards size={20} /></div>
            <div className="paired-metric"><div><span>Combat first</span><strong>{result.control.metrics.simulatedCharacterSpend}</strong></div><div><span>Affinity first</span><strong>{result.treatment.metrics.simulatedCharacterSpend}</strong></div><div className="metric-diff"><span>Difference</span><strong>{signed(result.pairedEffect)}</strong></div></div>
            <p className="panel-note">单位：SYNTHETIC_RESOURCE_UNIT。无日元、菲林、抽数或测试网 USDC 换算。</p>
          </article>
          <article className="panel event-panel">
            <div className="panel-heading"><div><span className="eyebrow">ACTION CHAIN</span><h2>{selectedBranch} / 事件记录</h2></div><button className="branch-toggle" onClick={() => setSelectedBranch(selectedBranch === "control" ? "treatment" : "control")}>{selectedBranch === "control" ? "Treatment" : "Control"}</button></div>
            <div className="event-list">{branch.events.filter((event) => event.type !== "LEDGER_ENTRY_RECORDED").slice(0, 30).map((event) => <div className="p-event" key={event.eventId}><span className={`event-mark ${event.type.toLowerCase()}`} /><div><strong>{event.action ?? event.type.replaceAll("_", " ")}</strong><small>Tick {event.tick} · {event.actorId ?? "system"} · {event.sourceIds.join(", ") || "internal ledger"}</small></div><code>{short(event.eventId, 6)}</code></div>)}</div>
          </article>
          <article className="panel ledger-panel">
            <div className="panel-heading"><div><span className="eyebrow">SYNTHETIC SPEND LEDGER</span><h2>余额与计划分离</h2></div><WalletCards size={20} /></div>
            <div className="ledger-list">{branch.ledger.filter((entry) => entry.category === "SIMULATED_TOP_UP" || entry.category === "PLANNED_PULL").slice(0, 18).map((entry) => <div className="ledger-row" key={entry.entryId}><code>{entry.agentId}</code><span>{entry.category}</span><strong>{entry.amount}</strong><small>{entry.executed ? "executed synthetic top-up" : "unexecuted plan"}</small></div>)}</div>
          </article>
        </section>
      )}

      {workspace === "outcome" && (
        <section className="workspace-grid outcome-grid">
          <article className="panel recommendation-panel">
            <div className="panel-heading"><div><span className="eyebrow">OUTCOME & CALIBRATION</span><h2>发行建议</h2></div><LineChart size={20} /></div>
            <div className="recommendation"><span>模型内方向</span><strong>{report.primaryResult.direction}</strong><p>{report.recommendation}</p></div>
            <div className="outcome-stats"><div><span>Paired difference</span><strong>{signed(report.primaryResult.pairedDifference)}</strong></div><div><span>Control</span><strong>{report.primaryResult.control}</strong></div><div><span>Treatment</span><strong>{report.primaryResult.treatment}</strong></div></div>
          </article>
          <article className="panel observation-panel">
            <div className="panel-heading"><div><span className="eyebrow">POST-LAUNCH OBSERVATORY</span><h2>{report.status}</h2></div><Clock3 size={20} /></div>
            <div className="observation-timeline">{(["T_RELEASE", "T_PLUS_24H", "T_PLUS_72H"] as const).map((point) => <div className="observation-step" key={point}><span className={report.observations.some((item) => item.point === point) ? "done" : "pending"}>{report.observations.some((item) => item.point === point) ? <Check size={13} /> : ""}</span><div><strong>{point}</strong><small>{point === "T_RELEASE" ? "2026-07-29 JST" : point === "T_PLUS_24H" ? "2026-07-30 JST" : "2026-08-01 JST"}</small></div></div>)}</div>
            <p className="panel-note">发布后才允许追加日本公开榜单和官方互动；当前没有真实观测数据。</p>
          </article>
          <article className="panel panel-wide">
            <div className="panel-heading"><div><span className="eyebrow">MECHANISM FUNNEL</span><h2>分支行动计数</h2></div><GitBranch size={20} /></div>
            <div className="funnel-table"><div className="funnel-row funnel-head"><span>Action</span><span>Combat first</span><span>Affinity first</span><span>Difference</span></div>{Object.entries(report.funnel).map(([action, values]) => <div className="funnel-row" key={action}><code>{action}</code><span>{values.control}</span><span>{values.treatment}</span><strong>{signed(values.treatment - values.control)}</strong></div>)}</div>
          </article>
          <article className="panel panel-wide">
            <div className="panel-heading"><div><span className="eyebrow">REPLAY & EXPORT</span><h2>结果可复现</h2></div><RotateCcw size={20} /></div>
            <div className="outcome-actions"><button onClick={replayCurrent} disabled={!pairId}><RotateCcw size={15} /> Replay</button><button onClick={downloadReport}><Download size={15} /> Export JSON</button></div>
            {replay && <div className="replay-result"><span>Replay event hash</span><code>{short(replay.eventHash, 16)}</code><span>Network {replay.sideEffects.networkCalls} · LLM {replay.sideEffects.llmCalls} · Ledger writes {replay.sideEffects.ledgerWrites}</span></div>}
            <div className="limitation-list">{report.limitations.map((item) => <p key={item}><ShieldCheck size={14} />{item}</p>)}</div>
          </article>
        </section>
      )}

      <footer className="publishing-footer"><span>合成模拟与移动端公开代理，不代表日本全平台或单角色真实流水。</span><span>Snapshot {short(result.snapshot.publicSourceBundleHash, 10)} · Protocol {short(result.protocol.protocolHash, 10)}</span></footer>
    </main>
  );
}
