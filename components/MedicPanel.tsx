"use client";

import { useState, useTransition } from "react";
import { activateMedic, getMedicAnalytics, getLatestDigest } from "@/app/actions/medic-actions";
import type { MedicAnalytics } from "@/app/actions/medic-actions";

type Props = {
  onClose: () => void;
  onTasksCreated: () => void;
};

type View = "activate" | "analytics" | "digest";

const SEVERITY_LABELS: Record<number, string> = {
  1: "Slightly off",
  2: "Struggling",
  3: "Difficult",
  4: "Very hard",
  5: "Crisis",
};

const SEVERITY_COLORS: Record<number, string> = {
  1: "rgba(0,255,255,0.7)",
  2: "rgba(139,92,246,0.7)",
  3: "rgba(251,191,36,0.7)",
  4: "rgba(236,72,153,0.7)",
  5: "rgba(239,68,68,0.8)",
};

export function MedicPanel({ onClose, onTasksCreated }: Props) {
  const [view, setView]             = useState<View>("activate");
  const [input, setInput]           = useState("");
  const [severity, setSeverity]     = useState(3);
  const [isPending, startTransition] = useTransition();
  const [result, setResult]         = useState<{ advice: string; taskCount: number } | null>(null);
  const [analytics, setAnalytics]   = useState<MedicAnalytics | null>(null);
  const [digest, setDigest]         = useState<{
    summary: string;
    weekStart: Date;
    totalWU: number;
    medicSessions: number;
  } | null>(null);

  function handleActivate() {
    if (!input.trim()) return;
    startTransition(async () => {
      const res = await activateMedic(input.trim(), severity);
      setResult({ advice: res.advice, taskCount: res.tasks.length });
      onTasksCreated();
    });
  }

  function handleAnalyticsTab() {
    setView("analytics");
    if (analytics) return;
    startTransition(async () => {
      const data = await getMedicAnalytics();
      setAnalytics(data);
    });
  }

  function handleDigestTab() {
    setView("digest");
    if (digest) return;
    startTransition(async () => {
      const data = await getLatestDigest();
      if (data) {
        setDigest({
          summary: data.summary,
          weekStart: data.weekStart,
          totalWU: data.totalWU,
          medicSessions: data.medicSessions,
        });
      }
    });
  }

  return (
    <>
      <style>{`
        .mp-overlay {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(0,0,0,0.75);
          backdrop-filter: blur(6px);
          display: flex; align-items: flex-end; justify-content: center;
        }
        .mp-panel {
          width: 100%; max-width: 520px;
          background: #07070c;
          border: 1px solid rgba(236,72,153,0.2);
          border-bottom: none;
          border-radius: 8px 8px 0 0;
          padding: 28px 24px 44px;
          max-height: 85vh;
          overflow-y: auto;
        }
        .mp-header {
          display: flex; align-items: center;
          justify-content: space-between;
          margin-bottom: 22px;
        }
        .mp-logo {
          display: flex; align-items: center; gap: 10px;
        }
        .mp-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: rgba(236,72,153,0.85);
          box-shadow: 0 0 10px rgba(236,72,153,0.7);
          animation: mp-pulse 2s ease-in-out infinite;
        }
        @keyframes mp-pulse {
          0%,100% { opacity: 1; }
          50% { opacity: 0.25; }
        }
        .mp-title {
          font-family: 'Share Tech Mono', monospace;
          font-size: 12px; letter-spacing: 0.25em;
          color: rgba(236,72,153,0.7);
          text-transform: uppercase;
        }
        .mp-close {
          background: none; border: none; cursor: pointer;
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px; letter-spacing: 0.1em;
          color: rgba(255,255,255,0.2);
          transition: color 0.2s;
          padding: 4px 0;
        }
        .mp-close:hover { color: rgba(255,255,255,0.55); }

        /* Tabs */
        .mp-tabs {
          display: flex;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          margin-bottom: 24px;
        }
        .mp-tab {
          padding: 8px 14px;
          background: none; border: none;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.2em;
          text-transform: uppercase;
          cursor: pointer;
          transition: color 0.2s, border-color 0.2s;
          color: rgba(255,255,255,0.2);
        }
        .mp-tab:hover { color: rgba(255,255,255,0.45); }
        .mp-tab.active {
          color: rgba(236,72,153,0.8);
          border-bottom-color: rgba(236,72,153,0.55);
        }

        /* Label */
        .mp-label {
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.25em;
          color: rgba(255,255,255,0.22);
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        /* Textarea */
        .mp-textarea {
          width: 100%; box-sizing: border-box;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 4px;
          padding: 12px;
          color: rgba(255,255,255,0.75);
          font-family: 'Rajdhani', sans-serif;
          font-size: 15px; line-height: 1.6;
          resize: none; outline: none;
          transition: border-color 0.2s;
        }
        .mp-textarea:focus { border-color: rgba(236,72,153,0.3); }
        .mp-textarea::placeholder { color: rgba(255,255,255,0.18); }

        /* Severity */
        .mp-severity-row {
          display: flex; align-items: center;
          justify-content: space-between;
          margin: 20px 0;
          gap: 12px;
        }
        .mp-pips { display: flex; gap: 6px; }
        .mp-pip {
          width: 34px; height: 34px;
          border-radius: 3px;
          border: 1px solid rgba(255,255,255,0.07);
          background: none;
          font-family: 'Share Tech Mono', monospace;
          font-size: 12px;
          color: rgba(255,255,255,0.25);
          cursor: pointer;
          transition: all 0.18s;
        }
        .mp-pip.active {
          color: var(--c);
          border-color: var(--c);
          background: rgba(255,255,255,0.02);
          box-shadow: 0 0 8px var(--c);
        }

        /* Primary button */
        .mp-btn {
          width: 100%; padding: 14px;
          background: rgba(236,72,153,0.07);
          border: 1px solid rgba(236,72,153,0.28);
          border-radius: 4px;
          color: rgba(236,72,153,0.85);
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px; font-weight: 700;
          letter-spacing: 0.14em; text-transform: uppercase;
          cursor: pointer; margin-top: 20px;
          transition: all 0.2s;
        }
        .mp-btn:hover:not(:disabled) {
          background: rgba(236,72,153,0.13);
          border-color: rgba(236,72,153,0.5);
        }
        .mp-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        /* Ghost button */
        .mp-btn-ghost {
          width: 100%; padding: 12px;
          background: none;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 4px;
          color: rgba(255,255,255,0.25);
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px; font-weight: 600;
          letter-spacing: 0.12em; text-transform: uppercase;
          cursor: pointer; margin-top: 12px;
          transition: all 0.2s;
        }
        .mp-btn-ghost:hover { color: rgba(255,255,255,0.5); border-color: rgba(255,255,255,0.15); }

        /* Result */
        .mp-result {
          margin-top: 20px; padding: 16px;
          background: rgba(236,72,153,0.04);
          border: 1px solid rgba(236,72,153,0.14);
          border-radius: 4px;
        }
        .mp-advice {
          font-family: 'Rajdhani', sans-serif;
          font-size: 15px; line-height: 1.65;
          color: rgba(255,255,255,0.65);
          margin-bottom: 12px;
        }
        .mp-result-meta {
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.18em;
          color: rgba(236,72,153,0.45);
          text-transform: uppercase;
        }

        /* Analytics */
        .mp-stat-row {
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 11px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .mp-stat-label {
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.18em;
          color: rgba(255,255,255,0.22);
          text-transform: uppercase;
        }
        .mp-stat-value {
          font-family: 'Rajdhani', sans-serif;
          font-size: 16px; font-weight: 700;
          color: rgba(255,255,255,0.72);
        }
        .mp-trigger {
          display: inline-block;
          padding: 4px 9px; margin: 3px;
          background: rgba(236,72,153,0.05);
          border: 1px solid rgba(236,72,153,0.18);
          border-radius: 2px;
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.08em;
          color: rgba(236,72,153,0.55);
        }
        .mp-bar-row {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 9px;
        }
        .mp-bar-label {
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px; font-weight: 600;
          color: rgba(255,255,255,0.5);
          width: 88px; flex-shrink: 0;
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .mp-bar-bg {
          flex: 1; height: 3px;
          background: rgba(255,255,255,0.05);
          border-radius: 2px; overflow: hidden;
        }
        .mp-bar-fill {
          height: 100%; border-radius: 2px;
          background: rgba(0,255,255,0.55);
          box-shadow: 0 0 5px rgba(0,255,255,0.3);
        }
        .mp-bar-pct {
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; color: rgba(0,255,255,0.4);
          width: 30px; text-align: right; flex-shrink: 0;
        }

        /* Digest */
        .mp-digest-summary {
          font-family: 'Rajdhani', sans-serif;
          font-size: 15px; line-height: 1.7;
          color: rgba(255,255,255,0.58);
          margin-bottom: 20px;
        }
        .mp-digest-stat {
          flex: 1; padding: 12px 10px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 3px; text-align: center;
        }
        .mp-digest-stat-val {
          font-family: 'Rajdhani', sans-serif;
          font-size: 22px; font-weight: 700;
        }
        .mp-digest-stat-lbl {
          font-family: 'Share Tech Mono', monospace;
          font-size: 8px; letter-spacing: 0.15em;
          color: rgba(255,255,255,0.22);
          text-transform: uppercase; margin-top: 4px;
        }

        /* Loading */
        .mp-loading {
          display: flex; align-items: center; gap: 10px;
          padding: 20px 0;
        }
        .mp-spinner {
          width: 15px; height: 15px;
          border: 1px solid rgba(236,72,153,0.25);
          border-top-color: rgba(236,72,153,0.75);
          border-radius: 50%;
          animation: mp-spin 0.75s linear infinite;
          flex-shrink: 0;
        }
        @keyframes mp-spin { to { transform: rotate(360deg); } }
        .mp-loading-text {
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.18em;
          color: rgba(255,255,255,0.2);
          text-transform: uppercase;
        }
        .mp-empty {
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.18em;
          color: rgba(255,255,255,0.18);
          text-transform: uppercase;
          padding: 16px 0;
        }
      `}</style>

      <div
        className="mp-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="mp-panel">

          {/* Header */}
          <div className="mp-header">
            <div className="mp-logo">
              <div className="mp-dot" />
              <span className="mp-title">// Medic</span>
            </div>
            <button className="mp-close" onClick={onClose}>CLOSE ×</button>
          </div>

          {/* Tabs */}
          <div className="mp-tabs">
            <button
              className={`mp-tab ${view === "activate" ? "active" : ""}`}
              onClick={() => setView("activate")}
            >
              Activate
            </button>
            <button
              className={`mp-tab ${view === "analytics" ? "active" : ""}`}
              onClick={handleAnalyticsTab}
            >
              Analytics
            </button>
            <button
              className={`mp-tab ${view === "digest" ? "active" : ""}`}
              onClick={handleDigestTab}
            >
              Last Digest
            </button>
          </div>

          {/* ── Activate ── */}
          {view === "activate" && (
            <>
              {!result ? (
                <>
                  <div className="mp-label">// What&apos;s pulling you down today?</div>

                  <textarea
                    className="mp-textarea"
                    rows={4}
                    placeholder="Write freely. This is for you."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />

                  <div className="mp-severity-row">
                    <span className="mp-label" style={{ margin: 0 }}>// Severity</span>

                    <div className="mp-pips">
                      {([1, 2, 3, 4, 5] as const).map((n) => (
                        <button
                          key={n}
                          className={`mp-pip ${severity === n ? "active" : ""}`}
                          style={{ ["--c" as string]: SEVERITY_COLORS[n] }}
                          onClick={() => setSeverity(n)}
                        >
                          {n}
                        </button>
                      ))}
                    </div>

                    <span style={{
                      fontFamily: "'Share Tech Mono', monospace",
                      fontSize: 9,
                      letterSpacing: "0.15em",
                      color: SEVERITY_COLORS[severity],
                      textTransform: "uppercase",
                      flexShrink: 0,
                    }}>
                      {SEVERITY_LABELS[severity]}
                    </span>
                  </div>

                  <button
                    className="mp-btn"
                    onClick={handleActivate}
                    disabled={isPending || !input.trim()}
                  >
                    {isPending ? "Analyzing..." : "Activate Medic Protocol"}
                  </button>
                </>
              ) : (
                <>
                  <div className="mp-result">
                    <p className="mp-advice">{result.advice}</p>
                    <p className="mp-result-meta">
                      {result.taskCount} recovery task{result.taskCount !== 1 ? "s" : ""} added to your mission stack
                    </p>
                  </div>

                  <button
                    className="mp-btn-ghost"
                    onClick={() => { setResult(null); setInput(""); setSeverity(3); }}
                  >
                    New Session
                  </button>
                </>
              )}
            </>
          )}

          {/* ── Analytics ── */}
          {view === "analytics" && (
            <>
              {isPending && !analytics ? (
                <div className="mp-loading">
                  <div className="mp-spinner" />
                  <span className="mp-loading-text">Loading analytics</span>
                </div>
              ) : !analytics || analytics.totalSessions === 0 ? (
                <p className="mp-empty">No medic sessions yet</p>
              ) : (
                <>
                  {/* Stats */}
                  <div style={{ marginBottom: 22 }}>
                    <div className="mp-stat-row">
                      <span className="mp-stat-label">Total Sessions</span>
                      <span className="mp-stat-value" style={{ color: "rgba(236,72,153,0.8)" }}>
                        {analytics.totalSessions}
                      </span>
                    </div>
                    <div className="mp-stat-row">
                      <span className="mp-stat-label">Avg Severity</span>
                      <span className="mp-stat-value">{analytics.avgSeverity} / 5</span>
                    </div>
                    <div className="mp-stat-row">
                      <span className="mp-stat-label">Avg Recovery</span>
                      <span className="mp-stat-value" style={{ color: "rgba(0,255,255,0.7)" }}>
                        {analytics.avgRecoveryDays ? `${analytics.avgRecoveryDays} days` : "Tracking..."}
                      </span>
                    </div>
                  </div>

                  {/* Triggers */}
                  {analytics.topTriggers.length > 0 && (
                    <div style={{ marginBottom: 22 }}>
                      <div className="mp-label">// Recurring triggers</div>
                      {analytics.topTriggers.map((t) => (
                        <span key={t.keyword} className="mp-trigger">
                          {t.keyword} ×{t.count}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Strong domains */}
                  {analytics.strongDomains.length > 0 && (
                    <div>
                      <div className="mp-label">// Domains active on bad days</div>
                      {analytics.strongDomains.map((d) => (
                        <div key={d.domain} className="mp-bar-row">
                          <span className="mp-bar-label">{d.domain}</span>
                          <div className="mp-bar-bg">
                            <div className="mp-bar-fill" style={{ width: `${d.completionRate}%` }} />
                          </div>
                          <span className="mp-bar-pct">{d.completionRate}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── Digest ── */}
          {view === "digest" && (
            <>
              {isPending && !digest ? (
                <div className="mp-loading">
                  <div className="mp-spinner" />
                  <span className="mp-loading-text">Loading digest</span>
                </div>
              ) : !digest ? (
                <p className="mp-empty">No digest generated yet — check back Monday</p>
              ) : (
                <>
                  <div style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: 9,
                    letterSpacing: "0.2em",
                    color: "rgba(255,255,255,0.18)",
                    textTransform: "uppercase",
                    marginBottom: 14,
                  }}>
                    Week of {new Date(digest.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()}
                  </div>

                  <p className="mp-digest-summary">{digest.summary}</p>

                  <div style={{ display: "flex", gap: 10 }}>
                    <div className="mp-digest-stat">
                      <div className="mp-digest-stat-val" style={{ color: "#00ffff" }}>
                        {digest.totalWU.toFixed(0)}
                      </div>
                      <div className="mp-digest-stat-lbl">Total WU</div>
                    </div>
                    <div className="mp-digest-stat">
                      <div className="mp-digest-stat-val" style={{ color: "rgba(236,72,153,0.8)" }}>
                        {digest.medicSessions}
                      </div>
                      <div className="mp-digest-stat-lbl">Medic Days</div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </>
  );
}