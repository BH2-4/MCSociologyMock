import { Activity, FlaskConical } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100";

export default function Home() {
  return (
    <main>
      <header className="topbar">
        <div className="brand"><FlaskConical size={18} /> AgoraSim</div>
        <span className="status"><Activity size={15} /> P0 workspace ready</span>
      </header>
      <section className="workspace">
        <p className="eyebrow">Injective x402 paired experiment</p>
        <h1>Verified evidence, observable effects.</h1>
        <p className="lede">
          The deterministic experiment engine, Agent runtime, and evidence dashboard are being assembled here.
        </p>
        <div className="notice">
          <strong>Research boundary</strong>
          <span>Synthetic simulation. Not a real-market forecast.</span>
        </div>
        <a className="api-link" href={`${API_URL}/health`}>Check API health</a>
      </section>
    </main>
  );
}
