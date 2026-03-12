"use client";

import { useRef, useState, useTransition } from "react";
import html2canvas from "html2canvas";

type DomainStat = {
  name: string;
  wu: number;
};

type Props = {
  weekStart: Date;
  weekEnd: Date;
  totalWU: number;
  domains: DomainStat[];
  userName?: string;
};

export function ShareCard({ weekStart, weekEnd, totalWU, domains, userName }: Props) {
  const cardRef                  = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [, startTransition]      = useTransition();

  const fmt = (d: Date) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const maxWU = Math.max(...domains.map((d) => d.wu), 1);

  async function handleDownload() {
    if (!cardRef.current) return;
    setDownloading(true);

    startTransition(async () => {
      try {
        const canvas = await html2canvas(cardRef.current!, {
          background: "#050508",
          useCORS: true,
          logging: false,
        });

        const link = document.createElement("a");
        link.download = `lifetrack-week-${fmt(weekStart).replace(" ", "-")}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } finally {
        setDownloading(false);
      }
    });
  }

  return (
    <>
      <style>{`
        /* ── Trigger button ── */
        .sc-trigger {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 18px;
          background: rgba(0,255,255,0.06);
          border: 1px solid rgba(0,255,255,0.25);
          border-radius: 4px;
          color: rgba(0,255,255,0.75);
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
        }
        .sc-trigger:hover:not(:disabled) {
          background: rgba(0,255,255,0.11);
          border-color: rgba(0,255,255,0.45);
        }
        .sc-trigger:disabled { opacity: 0.4; cursor: not-allowed; }

        .sc-trigger-icon { font-size: 14px; }

        /* ── Card (captured by html2canvas) ── */
        .sc-card {
          position: fixed;
          left: -9999px; top: -9999px; /* off screen — invisible to user */
          width: 400px;
          background: #050508;
          padding: 36px 32px 32px;
          font-family: 'Share Tech Mono', monospace;
          box-sizing: border-box;
        }

        /* Top row */
        .sc-card-header {
          display: flex; align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 28px;
        }

        .sc-wordmark {
          font-size: 10px; letter-spacing: 0.35em;
          color: rgba(0,255,255,0.5);
          text-transform: uppercase;
        }

        .sc-week-label {
          font-size: 9px; letter-spacing: 0.2em;
          color: rgba(255,255,255,0.2);
          text-transform: uppercase;
          text-align: right;
          margin-top: 3px;
        }

        /* Total WU */
        .sc-total-wu {
          margin-bottom: 28px;
        }

        .sc-wu-eyebrow {
          font-size: 8px; letter-spacing: 0.3em;
          color: rgba(255,255,255,0.2);
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .sc-wu-number {
          font-size: 52px; font-weight: 700;
          color: #00ffff;
          font-family: 'Rajdhani', sans-serif;
          line-height: 1;
          text-shadow: 0 0 30px rgba(0,255,255,0.4);
        }

        .sc-wu-unit {
          font-size: 14px;
          color: rgba(0,255,255,0.45);
          font-family: 'Share Tech Mono', monospace;
          letter-spacing: 0.2em;
          margin-left: 6px;
        }

        /* Domain bars */
        .sc-domains {
          margin-bottom: 28px;
        }

        .sc-domain-row {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 10px;
        }
        .sc-domain-row:last-child { margin-bottom: 0; }

        .sc-domain-name {
          font-size: 9px; letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.4);
          width: 80px; flex-shrink: 0;
        }

        .sc-bar-bg {
          flex: 1; height: 4px;
          background: rgba(255,255,255,0.05);
          border-radius: 2px; overflow: hidden;
        }

        .sc-bar-fill {
          height: 100%; border-radius: 2px;
          background: rgba(0,255,255,0.6);
        }

        .sc-domain-wu {
          font-size: 9px; letter-spacing: 0.08em;
          color: rgba(0,255,255,0.45);
          width: 42px; text-align: right; flex-shrink: 0;
        }

        /* Divider */
        .sc-divider {
          height: 1px;
          background: rgba(255,255,255,0.05);
          margin-bottom: 18px;
        }

        /* Footer */
        .sc-footer {
          display: flex; align-items: center;
          justify-content: space-between;
        }

        .sc-watermark {
          font-size: 9px; letter-spacing: 0.2em;
          color: rgba(255,255,255,0.12);
          text-transform: uppercase;
        }

        .sc-user {
          font-size: 9px; letter-spacing: 0.15em;
          color: rgba(255,255,255,0.18);
          text-transform: uppercase;
        }

        /* Scanline overlay effect */
        .sc-scanlines {
          position: absolute; inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.03) 2px,
            rgba(0,0,0,0.03) 4px
          );
          pointer-events: none;
        }
      `}</style>

      {/* ── Download button ── */}
      <button
        className="sc-trigger"
        onClick={handleDownload}
        disabled={downloading}
      >
        <span className="sc-trigger-icon">↓</span>
        {downloading ? "Generating..." : "Save Card"}
      </button>

      {/* ── Hidden card — captured by html2canvas ── */}
      <div ref={cardRef} className="sc-card" style={{ position: "fixed", left: -9999, top: -9999 }}>
        <div className="sc-scanlines" />

        {/* Header */}
        <div className="sc-card-header">
          <div>
            <div className="sc-wordmark">LifeTrack</div>
          </div>
          <div>
            <div className="sc-week-label">
              {fmt(weekStart)} — {fmt(weekEnd)}
            </div>
            <div className="sc-week-label" style={{ marginTop: 2 }}>
              Weekly Report
            </div>
          </div>
        </div>

        {/* Total WU */}
        <div className="sc-total-wu">
          <div className="sc-wu-eyebrow">// Work Units Earned</div>
          <div>
            <span className="sc-wu-number">{totalWU.toFixed(0)}</span>
            <span className="sc-wu-unit">WU</span>
          </div>
        </div>

        {/* Domain bars */}
        <div className="sc-domains">
          {domains
            .filter((d) => d.wu > 0)
            .sort((a, b) => b.wu - a.wu)
            .map((d) => (
              <div key={d.name} className="sc-domain-row">
                <span className="sc-domain-name">{d.name}</span>
                <div className="sc-bar-bg">
                  <div
                    className="sc-bar-fill"
                    style={{ width: `${Math.round((d.wu / maxWU) * 100)}%` }}
                  />
                </div>
                <span className="sc-domain-wu">{d.wu.toFixed(0)}</span>
              </div>
            ))}
        </div>

        <div className="sc-divider" />

        {/* Footer */}
        <div className="sc-footer">
          <span className="sc-watermark">lifetrack.app</span>
          {userName && (
            <span className="sc-user">{userName}</span>
          )}
        </div>
      </div>
    </>
  );
}