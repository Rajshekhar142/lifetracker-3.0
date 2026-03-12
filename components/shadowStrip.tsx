"use client";

import { useEffect, useState, useTransition } from "react";
import { getShadowData } from "@/app/actions/shadow-actions";
import type { ShadowData } from "@/app/actions/shadow-actions";

type Props = {
  refreshTrigger?: number; // increment this from mission page after task completes
};

export function ShadowStrip({ refreshTrigger = 0 }: Props) {
  const [data, setData]             = useState<ShadowData | null>(null);
  const [expanded, setExpanded]     = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await getShadowData();
      setData(result);
    });
  }, [refreshTrigger]);

  // How many domains has Shadow approved today
  const approvedCount  = data?.domains.filter((d) => d.approved).length ?? 0;
  const totalCount     = data?.domains.length ?? 0;
  const anyApproved    = approvedCount > 0;
  const allApproved    = totalCount > 0 && approvedCount === totalCount;

  return (
    <>
      <style>{`
        .ss-strip {
          width: 100%;
          background: #06060b;
          border-top: 1px solid rgba(255,255,255,0.04);
          border-bottom: 1px solid rgba(255,255,255,0.04);
          user-select: none;
        }

        /* ── Collapsed header ── */
        .ss-header {
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 10px 20px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .ss-header:hover { background: rgba(255,255,255,0.01); }

        .ss-left {
          display: flex; align-items: center; gap: 10px;
        }

        /* Shadow mask icon */
        .ss-mask {
          width: 28px; height: 28px;
          position: relative; flex-shrink: 0;
        }

        .ss-mask-svg {
          width: 28px; height: 28px;
          transition: filter 0.4s ease;
        }

        .ss-mask-svg.watching {
          filter: drop-shadow(0 0 0px transparent);
        }

        .ss-mask-svg.approved {
          filter: drop-shadow(0 0 6px rgba(0,255,255,0.9))
                  drop-shadow(0 0 12px rgba(0,255,255,0.5));
          animation: ss-flare 2.5s ease-in-out infinite;
        }

        .ss-mask-svg.all-approved {
          filter: drop-shadow(0 0 8px rgba(255,255,200,0.95))
                  drop-shadow(0 0 18px rgba(0,255,255,0.7));
          animation: ss-flare-full 1.8s ease-in-out infinite;
        }

        @keyframes ss-flare {
          0%,100% { filter: drop-shadow(0 0 5px rgba(0,255,255,0.8)) drop-shadow(0 0 10px rgba(0,255,255,0.4)); }
          50%      { filter: drop-shadow(0 0 10px rgba(0,255,255,1)) drop-shadow(0 0 20px rgba(0,255,255,0.6)); }
        }

        @keyframes ss-flare-full {
          0%,100% { filter: drop-shadow(0 0 8px rgba(255,255,200,0.9)) drop-shadow(0 0 16px rgba(0,255,255,0.6)); }
          50%      { filter: drop-shadow(0 0 14px rgba(255,255,255,1)) drop-shadow(0 0 28px rgba(0,255,255,0.8)); }
        }

        .ss-identity {
          display: flex; flex-direction: column; gap: 2px;
        }

        .ss-name {
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px; letter-spacing: 0.25em;
          text-transform: uppercase;
          transition: color 0.4s;
        }
        .ss-name.watching    { color: rgba(255,255,255,0.25); }
        .ss-name.approved    { color: rgba(0,255,255,0.75); }
        .ss-name.all-approved { color: rgba(255,255,255,0.9); }

        .ss-status {
          font-family: 'Share Tech Mono', monospace;
          font-size: 8px; letter-spacing: 0.2em;
          text-transform: uppercase;
          transition: color 0.4s;
        }
        .ss-status.watching    { color: rgba(255,255,255,0.15); }
        .ss-status.approved    { color: rgba(0,255,255,0.45); }
        .ss-status.all-approved { color: rgba(0,255,255,0.7); }

        /* Right side — score + chevron */
        .ss-right {
          display: flex; align-items: center; gap: 12px;
        }

        .ss-score {
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px; letter-spacing: 0.15em;
          transition: color 0.4s;
        }
        .ss-score.watching    { color: rgba(255,255,255,0.18); }
        .ss-score.approved    { color: rgba(0,255,255,0.6); }
        .ss-score.all-approved { color: rgba(255,255,255,0.85); }

        .ss-chevron {
          font-size: 10px; color: rgba(255,255,255,0.18);
          transition: transform 0.25s;
        }
        .ss-chevron.open { transform: rotate(180deg); }

        /* ── Expanded domain rows ── */
        .ss-domains {
          padding: 0 20px 14px;
          border-top: 1px solid rgba(255,255,255,0.03);
        }

        .ss-domain-row {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.03);
        }
        .ss-domain-row:last-child { border-bottom: none; }

        .ss-domain-name {
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase;
          width: 88px; flex-shrink: 0;
          transition: color 0.3s;
        }

        /* Bar */
        .ss-bar-bg {
          flex: 1; height: 3px;
          background: rgba(255,255,255,0.05);
          border-radius: 2px; overflow: hidden;
          position: relative;
        }

        .ss-bar-fill {
          height: 100%; border-radius: 2px;
          transition: width 0.6s cubic-bezier(0.4,0,0.2,1), background 0.4s;
        }

        .ss-bar-fill.watching {
          background: rgba(255,255,255,0.15);
        }

        .ss-bar-fill.approved {
          background: rgba(0,255,255,0.7);
          box-shadow: 0 0 6px rgba(0,255,255,0.5);
        }

        .ss-bar-fill.no-history {
          background: rgba(255,255,255,0.06);
        }

        /* Threshold tick mark at 100% */
        .ss-tick {
          position: absolute;
          top: -2px; bottom: -2px;
          width: 1px;
          background: rgba(255,255,255,0.25);
          left: calc(min(100%, 87%)); /* visual only — always at ~87% of bar */
        }

        /* Right label */
        .ss-domain-right {
          display: flex; flex-direction: column;
          align-items: flex-end; gap: 1px;
          flex-shrink: 0; width: 80px;
        }

        .ss-wu-today {
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.1em;
          transition: color 0.3s;
        }

        .ss-domain-tag {
          font-family: 'Share Tech Mono', monospace;
          font-size: 8px; letter-spacing: 0.15em;
          text-transform: uppercase;
          transition: color 0.3s;
        }

        /* Loading shimmer */
        .ss-shimmer {
          height: 3px; border-radius: 2px;
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.04) 25%,
            rgba(255,255,255,0.09) 50%,
            rgba(255,255,255,0.04) 75%
          );
          background-size: 200% 100%;
          animation: ss-shimmer 1.4s ease-in-out infinite;
        }
        @keyframes ss-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* Next threshold update */
        .ss-next-update {
          font-family: 'Share Tech Mono', monospace;
          font-size: 8px; letter-spacing: 0.15em;
          color: rgba(255,255,255,0.12);
          text-transform: uppercase;
          padding: 8px 0 2px;
          text-align: right;
        }
      `}</style>

      <div className="ss-strip">

        {/* ── Collapsed header — always visible ── */}
        <div className="ss-header" onClick={() => setExpanded((p) => !p)}>
          <div className="ss-left">

            {/* Shadow mask SVG */}
            <div className="ss-mask">
              <svg
                className={`ss-mask-svg ${allApproved ? "all-approved" : anyApproved ? "approved" : "watching"}`}
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Mask shape */}
                <path
                  d="M14 3 C8 3 4 7 4 12 C4 17 7 20 10 21 L10 23 C10 24.1 10.9 25 12 25 L16 25 C17.1 25 18 24.1 18 23 L18 21 C21 20 24 17 24 12 C24 7 20 3 14 3Z"
                  fill="rgba(255,255,255,0.06)"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="0.75"
                />
                {/* Eyes — light up when approved */}
                <ellipse
                  cx="10.5" cy="12"
                  rx="2" ry="1.4"
                  fill={anyApproved ? (allApproved ? "rgba(255,255,255,0.95)" : "rgba(0,255,255,0.9)") : "rgba(255,255,255,0.15)"}
                  style={{ transition: "fill 0.4s" }}
                />
                <ellipse
                  cx="17.5" cy="12"
                  rx="2" ry="1.4"
                  fill={anyApproved ? (allApproved ? "rgba(255,255,255,0.95)" : "rgba(0,255,255,0.9)") : "rgba(255,255,255,0.15)"}
                  style={{ transition: "fill 0.4s" }}
                />
                {/* Mouth slit */}
                <path
                  d="M11 17.5 Q14 18.5 17 17.5"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="0.75"
                  fill="none"
                />
              </svg>
            </div>

            <div className="ss-identity">
              <span className={`ss-name ${allApproved ? "all-approved" : anyApproved ? "approved" : "watching"}`}>
                Shadow
              </span>
              <span className={`ss-status ${allApproved ? "all-approved" : anyApproved ? "approved" : "watching"}`}>
                {isPending
                  ? "// syncing"
                  : allApproved
                  ? "// all thresholds broken"
                  : anyApproved
                  ? `// ${approvedCount}/${totalCount} domains approved`
                  : "// watching"}
              </span>
            </div>
          </div>

          <div className="ss-right">
            <span className={`ss-score ${allApproved ? "all-approved" : anyApproved ? "approved" : "watching"}`}>
              {approvedCount}/{totalCount}
            </span>
            <span className={`ss-chevron ${expanded ? "open" : ""}`}>▾</span>
          </div>
        </div>

        {/* ── Expanded domain rows ── */}
        {expanded && (
          <div className="ss-domains">
            {isPending || !data ? (
              // Loading shimmer
              [1, 2, 3].map((i) => (
                <div key={i} className="ss-domain-row">
                  <div style={{ width: 88, height: 10, borderRadius: 2 }} className="ss-shimmer" />
                  <div className="ss-bar-bg" style={{ flex: 1 }}>
                    <div className="ss-shimmer" style={{ height: "100%", borderRadius: 2 }} />
                  </div>
                  <div style={{ width: 60, height: 10, borderRadius: 2 }} className="ss-shimmer" />
                </div>
              ))
            ) : (
              <>
                {data.domains.map((d) => (
                  <div key={d.domainId} className="ss-domain-row">

                    {/* Domain name */}
                    <span
                      className="ss-domain-name"
                      style={{
                        color: d.approved
                          ? "rgba(0,255,255,0.8)"
                          : d.hasHistory
                          ? "rgba(255,255,255,0.45)"
                          : "rgba(255,255,255,0.2)",
                      }}
                    >
                      {d.domainName}
                    </span>

                    {/* Progress bar */}
                    <div className="ss-bar-bg">
                      <div
                        className={`ss-bar-fill ${
                          !d.hasHistory ? "no-history" :
                          d.approved ? "approved" : "watching"
                        }`}
                        style={{
                          width: d.hasHistory
                            ? `${Math.min(d.progressPct, 100)}%`
                            : "8%",
                        }}
                      />
                      {/* Threshold tick */}
                      {d.hasHistory && <div className="ss-tick" />}
                    </div>

                    {/* WU + status */}
                    <div className="ss-domain-right">
                      <span
                        className="ss-wu-today"
                        style={{
                          color: d.approved
                            ? "rgba(0,255,255,0.7)"
                            : "rgba(255,255,255,0.3)",
                        }}
                      >
                        {d.hasHistory
                          ? `${d.todayWU} / ${d.threshold} WU`
                          : `${d.todayWU} WU`}
                      </span>
                      <span
                        className="ss-domain-tag"
                        style={{
                          color: d.approved
                            ? "rgba(0,255,255,0.55)"
                            : d.hasHistory
                            ? "rgba(255,255,255,0.15)"
                            : "rgba(255,255,255,0.1)",
                        }}
                      >
                        {d.approved
                          ? "// approved"
                          : d.hasHistory
                          ? "// watching"
                          : "// observing"}
                      </span>
                    </div>

                  </div>
                ))}

                {/* Next threshold update hint */}
                {data.lastUpdated && (
                  <div className="ss-next-update">
                    threshold updates every 7 days
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </>
  );
}