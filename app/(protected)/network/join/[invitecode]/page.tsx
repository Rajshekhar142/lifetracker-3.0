"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { getNetworkByInviteCode, joinNetwork } from "@/app/actions/network-actions";

type NetworkPreview = {
  id: string;
  name: string;
  domain: string;
  inviteCode: string;
  createdBy: { name: string | null };
  _count: { members: number };
};

const DOMAIN_COLORS: Record<string, string> = {
  Physical:   "#00ffff",
  Mental:     "#a78bfa",
  Emotional:  "#f472b6",
  Spiritual:  "#34d399",
  Social:     "#fbbf24",
  Financial:  "#60a5fa",
  Vocational: "#fb923c",
};

export default function JoinNetworkPage() {
  const params                        = useParams();
  const router                        = useRouter();
  const inviteCode                    = params.inviteCode as string;
  const [network, setNetwork]         = useState<NetworkPreview | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [joined, setJoined]           = useState(false);
  const [isPending, startTransition]  = useTransition();

  useEffect(() => {
    if (!inviteCode) return;
    getNetworkByInviteCode(inviteCode)
      .then(setNetwork)
      .catch(() => setError("Invalid or expired invite link."));
  }, [inviteCode]);

  function handleJoin() {
    startTransition(async () => {
      try {
        await joinNetwork(inviteCode);
        setJoined(true);
        setTimeout(() => router.push("/network"), 2000);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to join";
        // Already a member — just redirect
        if (msg === "Already a member") {
          router.push("/network");
          return;
        }
        setError(msg);
      }
    });
  }

  const accentColor = network
    ? DOMAIN_COLORS[network.domain] ?? "#00ffff"
    : "#00ffff";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=Share+Tech+Mono&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .jn-root {
          min-height: 100vh;
          background: #050508;
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
          font-family: 'Rajdhani', sans-serif;
        }

        /* Background grid */
        .jn-root::before {
          content: '';
          position: fixed; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }

        .jn-card {
          width: 100%; max-width: 400px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          padding: 36px 32px;
          position: relative;
          z-index: 1;
        }

        /* Accent top border */
        .jn-card::before {
          content: '';
          position: absolute;
          top: -1px; left: 10%; right: 10%;
          height: 1px;
          background: var(--accent);
          opacity: 0.6;
          border-radius: 0 0 4px 4px;
          box-shadow: 0 0 12px var(--accent);
        }

        .jn-eyebrow {
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.3em;
          color: rgba(255,255,255,0.2);
          text-transform: uppercase;
          margin-bottom: 20px;
        }

        .jn-name {
          font-size: 28px; font-weight: 700;
          letter-spacing: 0.03em;
          color: rgba(255,255,255,0.9);
          margin-bottom: 10px;
          line-height: 1.15;
        }

        .jn-meta {
          display: flex; align-items: center;
          gap: 12px; flex-wrap: wrap;
          margin-bottom: 28px;
        }

        .jn-domain-badge {
          padding: 4px 10px;
          border-radius: 2px;
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.15em;
          text-transform: uppercase;
          border: 1px solid var(--accent);
          color: var(--accent);
          background: rgba(255,255,255,0.02);
        }

        .jn-meta-text {
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.12em;
          color: rgba(255,255,255,0.2);
          text-transform: uppercase;
        }

        .jn-divider {
          height: 1px;
          background: rgba(255,255,255,0.05);
          margin-bottom: 24px;
        }

        .jn-info-row {
          display: flex; align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .jn-info-label {
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.15em;
          color: rgba(255,255,255,0.2);
          text-transform: uppercase;
        }

        .jn-info-value {
          font-size: 14px; font-weight: 600;
          letter-spacing: 0.04em;
          color: rgba(255,255,255,0.55);
        }

        .jn-capacity-bar {
          width: 80px; height: 3px;
          background: rgba(255,255,255,0.06);
          border-radius: 2px; overflow: hidden;
        }

        .jn-capacity-fill {
          height: 100%; border-radius: 2px;
          background: var(--accent);
          opacity: 0.6;
        }

        .jn-join-btn {
          width: 100%; padding: 14px;
          margin-top: 24px;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--accent);
          border-radius: 4px;
          color: var(--accent);
          font-family: 'Rajdhani', sans-serif;
          font-size: 14px; font-weight: 700;
          letter-spacing: 0.15em; text-transform: uppercase;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 0 0 20px rgba(0,0,0,0.3);
        }
        .jn-join-btn:hover:not(:disabled) {
          background: rgba(255,255,255,0.06);
          box-shadow: 0 0 16px var(--accent), 0 0 32px rgba(0,0,0,0.4);
        }
        .jn-join-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        /* Full state */
        .jn-join-btn.full {
          border-color: rgba(239,68,68,0.4);
          color: rgba(239,68,68,0.5);
          cursor: not-allowed;
        }

        /* Success state */
        .jn-success {
          text-align: center; padding: 8px 0;
        }

        .jn-success-icon {
          font-size: 32px; margin-bottom: 12px;
          display: block;
          animation: jn-pop 0.4s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes jn-pop {
          from { transform: scale(0); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }

        .jn-success-title {
          font-size: 20px; font-weight: 700;
          color: var(--accent);
          margin-bottom: 6px;
          letter-spacing: 0.05em;
        }

        .jn-success-sub {
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.2em;
          color: rgba(255,255,255,0.2);
          text-transform: uppercase;
        }

        /* Error */
        .jn-error {
          margin-top: 14px; padding: 12px;
          background: rgba(239,68,68,0.05);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 3px;
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.12em;
          color: rgba(239,68,68,0.65);
          text-transform: uppercase;
        }

        /* Loading */
        .jn-loading {
          text-align: center;
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px; letter-spacing: 0.25em;
          color: rgba(255,255,255,0.15);
          text-transform: uppercase;
        }

        .jn-spinner {
          width: 20px; height: 20px;
          border: 1px solid rgba(255,255,255,0.08);
          border-top-color: rgba(0,255,255,0.5);
          border-radius: 50%;
          animation: jn-spin 0.8s linear infinite;
          margin: 0 auto 16px;
        }
        @keyframes jn-spin { to { transform: rotate(360deg); } }

        /* Invalid link */
        .jn-invalid {
          text-align: center;
        }

        .jn-invalid-title {
          font-size: 18px; font-weight: 700;
          color: rgba(255,255,255,0.4);
          margin-bottom: 8px; letter-spacing: 0.05em;
        }

        .jn-invalid-sub {
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.2em;
          color: rgba(255,255,255,0.15);
          text-transform: uppercase;
        }

        .jn-wordmark {
          position: fixed; bottom: 24px; left: 50%;
          transform: translateX(-50%);
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.3em;
          color: rgba(255,255,255,0.08);
          text-transform: uppercase;
          z-index: 0;
        }
      `}</style>

      <div
        className="jn-root"
        style={{ ["--accent" as string]: accentColor }}
      >
        <div className="jn-card">

          {/* Loading */}
          {!network && !error && (
            <div className="jn-loading">
              <div className="jn-spinner" />
              Verifying invite
            </div>
          )}

          {/* Invalid */}
          {error && !joined && (
            <div className="jn-invalid">
              <div className="jn-invalid-title">Invalid Link</div>
              <div className="jn-invalid-sub">{error}</div>
            </div>
          )}

          {/* Success */}
          {joined && (
            <div className="jn-success">
              <span className="jn-success-icon">◆</span>
              <div className="jn-success-title">You&apos;re In</div>
              <div className="jn-success-sub">Redirecting to networks...</div>
            </div>
          )}

          {/* Network preview */}
          {network && !joined && (
            <>
              <div className="jn-eyebrow">// You&apos;ve been invited to join</div>

              <div className="jn-name">{network.name}</div>

              <div className="jn-meta">
                <span className="jn-domain-badge">{network.domain}</span>
                <span className="jn-meta-text">
                  by {network.createdBy.name ?? "Anonymous"}
                </span>
              </div>

              <div className="jn-divider" />

              {/* Members */}
              <div className="jn-info-row">
                <span className="jn-info-label">Members</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="jn-capacity-bar">
                    <div
                      className="jn-capacity-fill"
                      style={{ width: `${(network._count.members / 20) * 100}%` }}
                    />
                  </div>
                  <span className="jn-info-value">
                    {network._count.members} / 20
                  </span>
                </div>
              </div>

              {/* Domain focus */}
              <div className="jn-info-row">
                <span className="jn-info-label">Domain Focus</span>
                <span className="jn-info-value" style={{ color: accentColor }}>
                  {network.domain}
                </span>
              </div>

              {/* Join button */}
              {network._count.members >= 20 ? (
                <button className="jn-join-btn full" disabled>
                  Network Full
                </button>
              ) : (
                <button
                  className="jn-join-btn"
                  onClick={handleJoin}
                  disabled={isPending}
                >
                  {isPending ? "Joining..." : `Join ${network.name}`}
                </button>
              )}

              {error && <div className="jn-error">{error}</div>}
            </>
          )}
        </div>

        <div className="jn-wordmark">LifeTrack</div>
      </div>
    </>
  );
}