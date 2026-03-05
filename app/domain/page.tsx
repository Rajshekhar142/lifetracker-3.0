"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  seedDomainsIfNew,
  getDomains,
  renameDomain,
  deleteDomain,
  addCustomDomain,
  confirmDomains,
} from "@/app/actions/domain-actions";

type Domain = {
  id: string;
  name: string;
  icon: string | null;
  createdAt: Date;
};

// Color accent derived from domain name for the 7 core domains
const ACCENT_MAP: Record<string, string> = {
  Physical:   "cyan",
  Mental:     "violet",
  Emotional:  "pink",
  Spiritual:  "cyan",
  Social:     "violet",
  Financial:  "pink",
  Vocational: "cyan",
};

const ACCENT_COLORS = {
  cyan:   { glow: "rgba(0,255,255,",   border: "rgba(0,255,255,",   text: "#00ffff" },
  violet: { glow: "rgba(139,92,246,",  border: "rgba(139,92,246,",  text: "#a78bfa" },
  pink:   { glow: "rgba(236,72,153,",  border: "rgba(236,72,153,",  text: "#f472b6" },
  neutral:{ glow: "rgba(148,163,184,", border: "rgba(148,163,184,", text: "#94a3b8" },
};
const DOMAIN_DESCRIPTIONS: Record<string, string> = {
  Physical:   "Body — fitness, sleep, nutrition, energy",
  Mental:     "Intellect — learning, focus, reasoning",
  Emotional:  "Inner world — self-awareness, healing, regulation",
  Spiritual:  "Meaning — values, purpose, peace, transcendence",
  Social:     "Connections — relationships, community, presence",
  Financial:  "Resources — earning, saving, building wealth",
  Vocational: "Craft — work, output, skills, contribution",
};

// In ACCENT_MAP, the fallback was "neutral" — cycle through the 3 instead:
function getAccent(name: string) {
  if (ACCENT_MAP[name]) {
    const key = ACCENT_MAP[name] as keyof typeof ACCENT_COLORS;
    return ACCENT_COLORS[key];
  }
  // Custom domains — cycle cyan → violet → pink based on name length
  const cycle = ["cyan", "violet", "pink"] as const;
  const key = cycle[name.length % 3];
  return ACCENT_COLORS[key];
}

// Completeness drives the whole ambient feel
function useCompleteness(count: number, max = 7) {
  return Math.min(count, max) / max;
}

export default function DomainPage() {
  const router = useRouter();
  const [domains, setDomains]       = useState<Domain[]>([]);
  const [loading, setLoading]       = useState(true);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editValue, setEditValue]   = useState("");
  const [addingNew, setAddingNew]   = useState(false);
  const [newName, setNewName]       = useState("");
  const [mounted, setMounted]       = useState(false);
  const [isPending, startTransition] = useTransition();

  const completeness = useCompleteness(domains.length);
  const isComplete   = domains.length >= 7;
  const coverage     = Math.round(completeness * 100);

  // Glow opacity scales with completeness
  const glowStrength  = 0.04 + completeness * 0.12; // 0.04 → 0.16
  const barColor      = completeness >= 1
    ? "#00ffff"
    : completeness >= 0.7
    ? "#a78bfa"
    : completeness >= 0.4
    ? "#f59e0b"
    : "#ef4444";

  useEffect(() => {
    setMounted(true);
    async function init() {
      await seedDomainsIfNew();
      const data = await getDomains();
      setDomains(data);
      setLoading(false);
    }
    init();
  }, []);

  const refresh = async () => {
    const data = await getDomains();
    setDomains(data);
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteDomain(id);
      await refresh();
    });
  };

  const handleRename = (id: string) => {
    if (!editValue.trim()) return;
    startTransition(async () => {
      await renameDomain(id, editValue);
      setEditingId(null);
      await refresh();
    });
  };

  const handleAddCustom = () => {
    if (!newName.trim()) return;
    startTransition(async () => {
      await addCustomDomain(newName);
      setNewName("");
      setAddingNew(false);
      await refresh();
    });
  };

  const handleConfirm = () => {
    startTransition(async () => {
      const firstId = await confirmDomains();
      if (firstId) {
        router.push(`/mission`);
      } else {
        router.push("/dashboard");
      }
    });
  };

  if (loading) {
    return (
      <div className="cp-root" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#050508" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ width: 28, height: 28, border: "1px solid rgba(0,255,255,0.4)", borderTopColor: "#00ffff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "rgba(0,255,255,0.4)", letterSpacing: "0.3em" }}>LOADING DOMAINS</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@300;400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .cp-root {
          font-family: 'Rajdhani', sans-serif;
          background: #050508;
          min-height: 100vh;
          color: #e2e8f0;
          overflow-x: hidden;
          position: relative;
        }

        /* Scanlines */
        .cp-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background: repeating-linear-gradient(
            0deg, transparent, transparent 2px,
            rgba(0,0,0,0.025) 2px, rgba(0,0,0,0.025) 4px
          );
          pointer-events: none;
          z-index: 100;
        }

        .bg-ambient {
          position: fixed;
          inset: 0;
          transition: background 1.2s ease;
          pointer-events: none;
          z-index: 0;
        }

        .cp-layout {
          position: relative;
          z-index: 1;
          max-width: 860px;
          margin: 0 auto;
          padding: 44px 24px 80px;
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }

        .cp-layout.mounted {
          opacity: 1;
          transform: translateY(0);
        }

        /* Top */
        .cp-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 44px;
          padding-bottom: 18px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .cp-logo {
          font-family: 'Share Tech Mono', monospace;
          font-size: 12px;
          color: rgba(0,255,255,0.45);
          letter-spacing: 0.2em;
        }

        /* Coverage bar */
        .coverage-wrap {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
        }

        .coverage-label {
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.2em;
          transition: color 0.8s ease;
        }

        .coverage-bar-bg {
          width: 140px;
          height: 2px;
          background: rgba(255,255,255,0.06);
          border-radius: 2px;
          overflow: hidden;
        }

        .coverage-bar-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.8s ease, background-color 0.8s ease, box-shadow 0.8s ease;
        }

        /* Hero */
        .cp-hero {
          margin-bottom: 40px;
        }

        .cp-eyebrow {
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px;
          color: rgba(0,255,255,0.35);
          letter-spacing: 0.35em;
          margin-bottom: 12px;
        }

        .cp-title {
          font-size: clamp(30px, 5vw, 48px);
          font-weight: 700;
          color: #fff;
          line-height: 1.05;
          letter-spacing: -0.01em;
          margin-bottom: 12px;
        }

        .cp-title .ghost {
          color: transparent;
          -webkit-text-stroke: 1px rgba(0,255,255,0.5);
        }

        .cp-copy {
          font-size: 14px;
          font-weight: 400;
          color: rgba(255,255,255,0.3);
          letter-spacing: 0.03em;
          line-height: 1.6;
          max-width: 480px;
        }

        .cp-copy em {
          font-style: normal;
          color: rgba(0,255,255,0.6);
        }

        /* Domain grid */
        .cp-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 10px;
          margin-bottom: 32px;
        }

        .domain-card {
          position: relative;
          padding: 18px 16px 16px;
          background: rgba(255,255,255,0.02);
          border-radius: 4px;
          cursor: default;
          transition: border-color 0.3s, background 0.3s, box-shadow 0.3s;
          overflow: hidden;
        }

        .domain-card::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 1px;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .domain-card:hover::after { opacity: 1; }

        .domain-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .domain-icon {
          font-size: 18px;
          line-height: 1;
          transition: color 0.3s;
        }

        .domain-actions {
          display: flex;
          gap: 6px;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .domain-card:hover .domain-actions { opacity: 1; }

        .domain-action-btn {
          background: none;
          border: none;
          padding: 2px 4px;
          cursor: pointer;
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.05em;
          transition: color 0.2s;
          line-height: 1;
        }

        .domain-name {
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: color 0.3s;
        }

        .domain-edit-input {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(0,255,255,0.3);
          border-radius: 3px;
          padding: 4px 8px;
          color: #00ffff;
          font-family: 'Rajdhani', sans-serif;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.08em;
          outline: none;
        }

        /* Add custom slot */
        .add-slot {
          padding: 18px 16px;
          background: rgba(255,255,255,0.01);
          border: 1px dashed rgba(255,255,255,0.08);
          border-radius: 4px;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .add-slot:hover {
          border-color: rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.03);
        }

        .add-slot-icon {
          font-size: 16px;
          color: rgba(255,255,255,0.2);
        }

        .add-slot-label {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.2);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .add-input-row {
          display: flex;
          gap: 8px;
        }

        .add-input {
          flex: 1;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 3px;
          padding: 8px 12px;
          color: #fff;
          font-family: 'Rajdhani', sans-serif;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.06em;
          outline: none;
          transition: border-color 0.2s;
        }

        .add-input:focus { border-color: rgba(0,255,255,0.4); }
        .add-input::placeholder { color: rgba(255,255,255,0.2); }

        .add-confirm-btn {
          padding: 8px 16px;
          background: rgba(0,255,255,0.08);
          border: 1px solid rgba(0,255,255,0.3);
          border-radius: 3px;
          color: #00ffff;
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }

        .add-confirm-btn:hover {
          background: rgba(0,255,255,0.14);
          border-color: rgba(0,255,255,0.5);
        }

        .add-cancel-btn {
          padding: 8px 12px;
          background: none;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 3px;
          color: rgba(255,255,255,0.3);
          font-family: 'Share Tech Mono', monospace;
          font-size: 11px;
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s;
        }

        .add-cancel-btn:hover {
          border-color: rgba(236,72,153,0.3);
          color: rgba(236,72,153,0.6);
        }

        /* Confirm CTA */
        .cp-cta-wrap {
          margin-top: 40px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 420px;
        }

        .cp-cta-status {
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.2em;
          transition: color 0.8s ease;
          margin-bottom: 4px;
        }

        .cp-btn-confirm {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 22px;
          border-radius: 4px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.8s ease;
          overflow: hidden;
        }

        .cp-btn-arrow {
          font-size: 18px;
          transition: transform 0.2s;
        }

        .cp-btn-confirm:hover .cp-btn-arrow {
          transform: translateX(5px);
        }

        .cp-btn-confirm:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Status bar */
        .cp-statusbar {
          margin-top: 56px;
          padding-top: 14px;
          border-top: 1px solid rgba(255,255,255,0.04);
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .cp-status-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          animation: pulse-dot 2.5s ease-in-out infinite;
          transition: background 0.8s ease, box-shadow 0.8s ease;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.25; }
        }

        .cp-status-text {
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px;
          color: rgba(255,255,255,0.15);
          letter-spacing: 0.15em;
          transition: color 0.8s ease;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="cp-root">

        {/* Ambient background — scales with completeness */}
        <div
          className="bg-ambient"
          style={{
            background: `
              radial-gradient(ellipse 55% 35% at 10% 15%, rgba(0,255,255,${glowStrength}) 0%, transparent 70%),
              radial-gradient(ellipse 45% 35% at 90% 85%, rgba(139,92,246,${glowStrength * 0.8}) 0%, transparent 70%)
            `,
          }}
        />

        <div className={`cp-layout ${mounted ? "mounted" : ""}`}>

          {/* Topbar */}
          <div className="cp-topbar">
            <div className="cp-logo">LIFETRACK // DOMAIN SETUP</div>
            <div className="coverage-wrap">
              <span
                className="coverage-label"
                style={{ color: barColor }}
              >
                {coverage}% COVERAGE
              </span>
              <div className="coverage-bar-bg">
                <div
                  className="coverage-bar-fill"
                  style={{
                    width: `${coverage}%`,
                    backgroundColor: barColor,
                    boxShadow: isComplete ? `0 0 8px ${barColor}` : "none",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Hero */}
          <div className="cp-hero">
            <div className="cp-eyebrow">// Configure Your System</div>
            <h1 className="cp-title">
              Your Life<br />
              <span className="ghost">Architecture</span>
            </h1>
            <p className="cp-copy">
              <em>Structure creates leverage.</em> We've initialized 7 core domains — the complete set for balanced growth.
              Rename, remove, or add your own. A complete system compounds faster.
            </p>
          </div>

          {/* Domain grid */}
          <div className="cp-grid">
            {domains.map((domain) => {
              const accent = getAccent(domain.name);
              const isEditing = editingId === domain.id;

              return (
                <div
                  key={domain.id}
                  className="domain-card"
                  style={{
                    border: `1px solid ${accent.border}0.15)`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = `${accent.border}0.35)`;
                    (e.currentTarget as HTMLDivElement).style.background = `${accent.glow}0.04)`;
                    (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 16px ${accent.glow}0.06)`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = `${accent.border}0.15)`;
                    (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                  }}
                >
                  <div className="domain-card-top">
                    <span className="domain-icon" style={{ color: `${accent.border}0.55)` }}>
                      {domain.icon ?? "◌"}
                    </span>
                    <div className="domain-actions">
                      {!isEditing && (
                        <>
                          <button
                            className="domain-action-btn"
                            style={{ color: "rgba(255,255,255,0.3)" }}
                            onClick={() => { setEditingId(domain.id); setEditValue(domain.name); }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = accent.text)}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
                          >
                            EDIT
                          </button>
                          <button
                            className="domain-action-btn"
                            style={{ color: "rgba(255,255,255,0.2)" }}
                            onClick={() => handleDelete(domain.id)}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
                          >
                            ✕
                          </button>
                        </>
                      )}
                      {isEditing && (
                        <button
                          className="domain-action-btn"
                          style={{ color: "rgba(255,255,255,0.2)" }}
                          onClick={() => setEditingId(null)}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        className="domain-edit-input"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleRename(domain.id); if (e.key === "Escape") setEditingId(null); }}
                        autoFocus
                      />
                      <button
                        className="domain-action-btn"
                        style={{ color: accent.text, fontSize: 14, padding: "4px 6px" }}
                        onClick={() => handleRename(domain.id)}
                      >
                        ↵
                      </button>
                    </div>
                  ) : (
                    <>
                        <div className="domain-name" style={{ color: "rgba(255,255,255,0.65)" }}>
                      {domain.name}
                    </div>
                    <div style={{
fontFamily: "'Share Tech Mono', monospace",
  fontSize: 9,
  color: "rgba(255,255,255,0.2)",
  letterSpacing: "0.08em",
  marginTop: 4,
  lineHeight: 1.4,
}}>
  {DOMAIN_DESCRIPTIONS[domain.name] ?? "Custom domain"}
</div>
                    </>
                    
                  )}
                </div>
              );
            })}

            {/* Add custom domain slot */}
            {!addingNew ? (
              <div className="add-slot" onClick={() => setAddingNew(true)}>
                <span className="add-slot-icon">+</span>
                <span className="add-slot-label">Custom Domain</span>
              </div>
            ) : (
              <div
  style={{
    padding: "16px",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 4,
  }}
>
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    }}
  >
    {/* Input on top */}
    <input
      className="add-input"
      placeholder="Domain name..."
      value={newName}
      onChange={(e) => setNewName(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleAddCustom();
        if (e.key === "Escape") {
          setAddingNew(false);
          setNewName("");
        }
      }}
      autoFocus
    />

    {/* Buttons below */}
    <div
      style={{
        display: "flex",
        gap: "8px",
      }}
    >
      <button
        className="add-confirm-btn"
        onClick={handleAddCustom}
        style={{ flex: 1 }}
      >
        ADD
      </button>

      <button
        className="add-cancel-btn"
        onClick={() => {
          setAddingNew(false);
          setNewName("");
        }}
        style={{ flex: 1 }}
      >
        REMOVE
      </button>
    </div>
  </div>
</div>
            )}
          </div>

          {/* Confirm CTA */}
          <div className="cp-cta-wrap">
            <div
              className="cp-cta-status"
              style={{ color: isComplete ? "rgba(0,255,255,0.5)" : "rgba(255,255,255,0.2)" }}
            >
              {isComplete
                ? "// SYSTEM COMPLETE — ALL 7 DOMAINS ACTIVE"
                : `// ${domains.length}/7 DOMAINS — SYSTEM RUNNING AT REDUCED CAPACITY`}
            </div>
            <button
              className="cp-btn-confirm"
              disabled={domains.length === 0 || isPending}
              onClick={handleConfirm}
              style={{
                background: isComplete
                  ? "rgba(0,255,255,0.08)"
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${isComplete ? "rgba(0,255,255,0.45)" : "rgba(255,255,255,0.12)"}`,
                color: isComplete ? "#00ffff" : "rgba(255,255,255,0.4)",
                boxShadow: isComplete
                  ? `0 0 24px rgba(0,255,255,${0.06 + completeness * 0.1})`
                  : "none",
              }}
            >
              <span>{isPending ? "Initializing..." : "Confirm & Enter System"}</span>
              <span className="cp-btn-arrow">→</span>
            </button>
          </div>

          {/* Status bar */}
          <div className="cp-statusbar">
            <div
              className="cp-status-dot"
              style={{
                background: barColor,
                boxShadow: `0 0 6px ${barColor}`,
              }}
            />
            <span className="cp-status-text">
              {domains.length} DOMAIN{domains.length !== 1 ? "S" : ""} CONFIGURED · {coverage}% LIFE COVERAGE
            </span>
          </div>

        </div>
      </div>
    </>
  );
}