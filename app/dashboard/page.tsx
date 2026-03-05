"use client";

import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useEffect, useState } from "react";
import { signOut } from "better-auth/api";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.replace("/sign-in");
    }
  }, [isPending, session, router]);

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050508]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border border-cyan-500/60 border-t-cyan-400 rounded-full animate-spin" />
          <p className="text-cyan-500/70 text-xs tracking-[0.3em] uppercase font-mono">
            Initializing System
          </p>
        </div>
      </div>
    );
  }

  if (!session?.user) return null;

  const { user } = session;

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  const domains = [
    { label: "Physical", icon: "◈", color: "cyan" },
    { label: "Mental", icon: "◇", color: "violet" },
    { label: "Emotional", icon: "◉", color: "pink" },
    { label: "Spiritual", icon: "△", color: "cyan" },
    { label: "Social", icon: "◎", color: "violet" },
    { label: "Financial", icon: "◆", color: "pink" },
    { label: "Vocational", icon: "▣", color: "cyan" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@300;400;500;600;700&display=swap');

        * { box-sizing: border-box; }

        .cp-root {
          font-family: 'Rajdhani', sans-serif;
          background: #050508;
          min-height: 100vh;
          color: #e2e8f0;
          overflow-x: hidden;
          position: relative;
        }

        /* Subtle scanlines */
        .cp-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.03) 2px,
            rgba(0,0,0,0.03) 4px
          );
          pointer-events: none;
          z-index: 100;
        }

        /* Deep background glow — barely visible */
        .bg-glow {
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 60% 40% at 15% 20%, rgba(0,255,255,0.04) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 85% 80%, rgba(180,0,255,0.04) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        /* Noise texture */
        .bg-noise {
          position: fixed;
          inset: 0;
          opacity: 0.025;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
        }

        .cp-layout {
          position: relative;
          z-index: 1;
          max-width: 900px;
          margin: 0 auto;
          padding: 48px 24px;
          opacity: ${mounted ? 1 : 0};
          transform: translateY(${mounted ? '0' : '12px'});
          transition: opacity 0.6s ease, transform 0.6s ease;
        }

        /* Top bar */
        .cp-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 56px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(0,255,255,0.08);
        }

        .cp-logo {
          font-family: 'Share Tech Mono', monospace;
          font-size: 13px;
          color: rgba(0,255,255,0.5);
          letter-spacing: 0.2em;
        }

        .cp-logo span {
          color: rgba(0,255,255,0.9);
        }

        .cp-user-tag {
          font-family: 'Share Tech Mono', monospace;
          font-size: 11px;
          color: rgba(255,255,255,0.3);
          letter-spacing: 0.1em;
        }

        .cp-user-tag strong {
          color: rgba(0,255,255,0.7);
          font-weight: 400;
        }

        /* Hero section */
        .cp-hero {
          margin-bottom: 52px;
        }

        .cp-eyebrow {
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px;
          color: rgba(0,255,255,0.4);
          letter-spacing: 0.35em;
          text-transform: uppercase;
          margin-bottom: 14px;
        }

        .cp-title {
          font-size: clamp(38px, 7vw, 64px);
          font-weight: 700;
          line-height: 1;
          letter-spacing: -0.01em;
          color: #fff;
          margin-bottom: 6px;
        }

        .cp-title .accent {
          color: transparent;
          -webkit-text-stroke: 1px rgba(0,255,255,0.6);
        }

        .cp-subtitle {
          font-size: 16px;
          font-weight: 300;
          color: rgba(255,255,255,0.35);
          letter-spacing: 0.05em;
          margin-top: 10px;
          max-width: 420px;
          line-height: 1.6;
        }

        /* Divider */
        .cp-divider {
          width: 40px;
          height: 1px;
          background: linear-gradient(to right, rgba(0,255,255,0.6), transparent);
          margin: 24px 0;
        }

        /* Domain grid */
        .cp-domains-label {
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px;
          color: rgba(255,255,255,0.2);
          letter-spacing: 0.3em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .cp-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
          gap: 10px;
          margin-bottom: 48px;
        }

        .cp-domain-chip {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
          padding: 14px 14px 12px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 4px;
          cursor: default;
          transition: border-color 0.2s, background 0.2s;
          position: relative;
          overflow: hidden;
        }

        .cp-domain-chip::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(to right, transparent, rgba(0,255,255,0.3), transparent);
          opacity: 0;
          transition: opacity 0.3s;
        }

        .cp-domain-chip:hover {
          background: rgba(0,255,255,0.03);
          border-color: rgba(0,255,255,0.2);
        }

        .cp-domain-chip:hover::after {
          opacity: 1;
        }

        .cp-domain-chip.violet:hover {
          background: rgba(139,92,246,0.04);
          border-color: rgba(139,92,246,0.25);
        }

        .cp-domain-chip.violet::after {
          background: linear-gradient(to right, transparent, rgba(139,92,246,0.4), transparent);
        }

        .cp-domain-chip.pink:hover {
          background: rgba(236,72,153,0.04);
          border-color: rgba(236,72,153,0.2);
        }

        .cp-domain-chip.pink::after {
          background: linear-gradient(to right, transparent, rgba(236,72,153,0.35), transparent);
        }

        .cp-domain-icon {
          font-size: 16px;
          color: rgba(0,255,255,0.5);
          line-height: 1;
        }

        .cp-domain-chip.violet .cp-domain-icon { color: rgba(139,92,246,0.6); }
        .cp-domain-chip.pink .cp-domain-icon { color: rgba(236,72,153,0.55); }

        .cp-domain-name {
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.08em;
          color: rgba(255,255,255,0.55);
          text-transform: uppercase;
        }

        /* Actions */
        .cp-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 420px;
        }

        .cp-btn-primary {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 22px;
          background: rgba(0,255,255,0.06);
          border: 1px solid rgba(0,255,255,0.35);
          border-radius: 4px;
          color: #00ffff;
          font-family: 'Rajdhani', sans-serif;
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
          overflow: hidden;
        }

        .cp-btn-primary::before {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(0,255,255,0.08);
          opacity: 0;
          transition: opacity 0.2s;
        }

        .cp-btn-primary:hover {
          border-color: rgba(0,255,255,0.7);
          box-shadow: 0 0 20px rgba(0,255,255,0.12), inset 0 0 20px rgba(0,255,255,0.04);
        }

        .cp-btn-primary:hover::before {
          opacity: 1;
        }

        .cp-btn-arrow {
          font-size: 18px;
          opacity: 0.6;
          transition: transform 0.2s, opacity 0.2s;
        }

        .cp-btn-primary:hover .cp-btn-arrow {
          transform: translateX(4px);
          opacity: 1;
        }

        .cp-btn-ghost {
          padding: 12px 22px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 4px;
          color: rgba(255,255,255,0.3);
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .cp-btn-ghost:hover {
          border-color: rgba(236,72,153,0.3);
          color: rgba(236,72,153,0.7);
        }

        /* Bottom status bar */
        .cp-statusbar {
          margin-top: 64px;
          padding-top: 16px;
          border-top: 1px solid rgba(255,255,255,0.04);
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .cp-status-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: rgba(0,255,255,0.6);
          box-shadow: 0 0 6px rgba(0,255,255,0.6);
          animation: pulse-dot 2.5s ease-in-out infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .cp-status-text {
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px;
          color: rgba(255,255,255,0.18);
          letter-spacing: 0.15em;
        }
      `}</style>

      <div className="cp-root">
        <div className="bg-glow" />
        <div className="bg-noise" />

        <div className="cp-layout">

          {/* Top bar */}
          <div className="cp-topbar">
            <div className="cp-logo">LIFE<span>TRACK</span> <span style={{opacity:0.3}}>v0.1</span></div>
            <div className="cp-user-tag">USER // <strong>{user.name || "UNKNOWN"}</strong></div>
          </div>

          {/* Hero */}
          <div className="cp-hero">
            <div className="cp-eyebrow">// System Active</div>
            <h1 className="cp-title">
              Build Your<br />
              <span className="accent">Architecture</span>
            </h1>
            <div className="cp-divider" />
            <p className="cp-subtitle">
              Structure your life across seven domains. Small actions. Measured effort. Long-term identity.
            </p>
          </div>

          {/* Domains */}
          <div className="cp-domains-label">// Domains Available</div>
          <div className="cp-grid">
            {domains.map((d) => (
              <div key={d.label} className={`cp-domain-chip ${d.color}`}>
                <span className="cp-domain-icon">{d.icon}</span>
                <span className="cp-domain-name">{d.label}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="cp-actions">
            <button
              onClick={() => router.push("/domain")}
              className="cp-btn-primary"
            >
              <span>Start Building</span>
              <span className="cp-btn-arrow">→</span>
            </button>
            <button onClick={handleSignOut} className="cp-btn-ghost">
              Disconnect Session
            </button>
          </div>

          {/* Status bar */}
          <div className="cp-statusbar">
            <div className="cp-status-dot" />
            <span className="cp-status-text">ALL SYSTEMS NOMINAL · SESSION ACTIVE</span>
          </div>

        </div>
      </div>
    </>
  );
}