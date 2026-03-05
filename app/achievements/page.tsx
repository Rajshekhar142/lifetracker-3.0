"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { signOut } from "better-auth/api";
import {
  getUserAchievements,
  toggleAchievementVisibility,
  evaluateMasteryAchievements,
  type UserAchievement,
} from "@/app/actions/achievement-store";
import {
  ALL_ACHIEVEMENTS,
  DOMAINS,
  MASTERY_TIERS,
  MASTERY_WU,
  masteryKey,
  type AchievementMeta,
  TOTAL_ALL,
} from "@/lib/Achievements";

// ─── Constants ────────────────────────────────────────────────────────────────
const TIER_ORDER = ["novice", "apprentice", "operator", "elite"] as const;

const TIER_COLORS: Record<string, string> = {
  novice:     "#94a3b8",
  apprentice: "#a78bfa",
  operator:   "#00ffff",
  elite:      "#fbbf24",
};

const TIER_GLOW: Record<string, string> = {
  novice:     "rgba(148,163,184,",
  apprentice: "rgba(139,92,246,",
  operator:   "rgba(0,255,255,",
  elite:      "rgba(251,191,36,",
};

// ─── Domain mastery row ───────────────────────────────────────────────────────
function DomainMasteryRow({
  domain,
  unlockedMap,
  onToggle,
  isPending,
}: {
  domain: string;
  unlockedMap: Map<string, UserAchievement>;
  onToggle: (key: string) => void;
  isPending: boolean;
}) {
  const highestTier = TIER_ORDER.filter((t) =>
    unlockedMap.has(masteryKey(domain, t))
  ).pop();

  const color = highestTier ? TIER_COLORS[highestTier] : "rgba(255,255,255,0.2)";
  const glow  = highestTier ? TIER_GLOW[highestTier] : null;

  return (
    <div style={{
      padding: "16px 14px",
      background: highestTier ? `${TIER_GLOW[highestTier]}0.03)` : "rgba(255,255,255,0.01)",
      border: `1px solid ${highestTier ? `${TIER_GLOW[highestTier]}0.15)` : "rgba(255,255,255,0.05)"}`,
      borderRadius: 4,
      transition: "all 0.4s ease",
    }}>
      {/* Domain header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{
          fontFamily: "'Rajdhani', sans-serif",
          fontSize: 14, fontWeight: 700,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color,
          textShadow: highestTier === "elite" ? `0 0 12px ${glow}0.5)` : "none",
          transition: "color 0.4s, text-shadow 0.4s",
        }}>
          {domain}
        </span>
        {highestTier && (
          <span style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 9, letterSpacing: "0.2em",
            color, textTransform: "uppercase",
            textShadow: `0 0 8px ${glow}0.7)`,
          }}>
            {highestTier}
          </span>
        )}
      </div>

      {/* Tier pips */}
      <div style={{ display: "flex", gap: 6 }}>
        {TIER_ORDER.map((tier) => {
          const key       = masteryKey(domain, tier);
          const achieved  = unlockedMap.get(key);
          const isUnlocked = !!achieved;
          const tc        = TIER_COLORS[tier];
          const tg        = TIER_GLOW[tier];

          return (
            <div
              key={tier}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}
              onClick={() => isUnlocked && !isPending && onToggle(key)}
              title={isUnlocked
                ? `${achieved.isPublic ? "Public" : "Private"} — click to toggle`
                : `${MASTERY_WU[tier]} WU required`}
            >
              {/* Progress bar pip */}
              <div style={{
                width: "100%", height: 3, borderRadius: 2,
                background: isUnlocked ? tc : "rgba(255,255,255,0.06)",
                boxShadow: isUnlocked ? `0 0 8px ${tg}0.5)` : "none",
                transition: "background 0.4s, box-shadow 0.4s",
                cursor: isUnlocked ? "pointer" : "default",
              }} />

              {/* Tier name */}
              <span style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 8, letterSpacing: "0.08em", textTransform: "uppercase",
                color: isUnlocked ? tc : "rgba(255,255,255,0.15)",
                transition: "color 0.4s",
              }}>
                {tier.slice(0, 3)}
              </span>

              {/* Public dot */}
              {isUnlocked && achieved.isPublic && (
                <div style={{
                  width: 3, height: 3, borderRadius: "50%",
                  background: tc,
                  boxShadow: `0 0 4px ${tg}0.9)`,
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Hidden achievement card ──────────────────────────────────────────────────
function HiddenCard({
  meta,
  achieved,
  onToggle,
  isPending,
}: {
  meta: AchievementMeta;
  achieved?: UserAchievement;
  onToggle: (key: string) => void;
  isPending: boolean;
}) {
  const isUnlocked = !!achieved;

  return (
    <div
      onClick={() => isUnlocked && !isPending && onToggle(meta.key)}
      style={{
        padding: "16px 14px",
        background: isUnlocked ? "rgba(0,255,255,0.03)" : "rgba(255,255,255,0.01)",
        border: `1px solid ${isUnlocked ? "rgba(0,255,255,0.18)" : "rgba(255,255,255,0.05)"}`,
        borderRadius: 4,
        cursor: isUnlocked ? "pointer" : "default",
        transition: "all 0.3s",
        position: "relative", overflow: "hidden",
      }}
    >
      {/* Ambient top glow on unlocked */}
      {isUnlocked && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 32,
          background: "linear-gradient(to bottom, rgba(0,255,255,0.05), transparent)",
          pointerEvents: "none",
        }} />
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {/* Icon */}
        <span style={{
          fontSize: 20, lineHeight: 1, flexShrink: 0,
          color: isUnlocked ? "#00ffff" : "rgba(255,255,255,0.1)",
          textShadow: isUnlocked ? "0 0 14px rgba(0,255,255,0.8)" : "none",
          transition: "color 0.3s, text-shadow 0.3s",
        }}>
          {isUnlocked ? meta.icon : "?"}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name */}
          <div style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: 14, fontWeight: 700, letterSpacing: "0.05em",
            color: isUnlocked ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.18)",
            marginBottom: 3,
          }}>
            {isUnlocked ? meta.name : "???"}
          </div>

          {/* Description */}
          <div style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: 12, fontWeight: 400, lineHeight: 1.5,
            color: isUnlocked ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)",
          }}>
            {isUnlocked ? meta.description : "Conditions unknown. Keep pushing."}
          </div>

          {/* Unlock date + visibility */}
          {isUnlocked && achieved && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
              <span style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 9, color: "rgba(0,255,255,0.4)", letterSpacing: "0.15em",
              }}>
                {new Date(achieved.unlockedAt).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric"
                }).toUpperCase()}
              </span>
              <span style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 9,
                color: achieved.isPublic ? "rgba(0,255,255,0.65)" : "rgba(255,255,255,0.2)",
                letterSpacing: "0.12em",
              }}>
                {achieved.isPublic ? "· PUBLIC" : "· PRIVATE"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AchievementsPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [unlocked, setUnlocked]       = useState<UserAchievement[]>([]);
  const [loading, setLoading]         = useState(true);
  const [mounted, setMounted]         = useState(false);
  const [sidenavOpen, setSidenavOpen] = useState(false);
  const [activeTab, setActiveTab]     = useState<"mastery" | "hidden">("mastery");
  const [isPending, startTransition]  = useTransition();

  const refresh = async () => {
    const data = await getUserAchievements();
    setUnlocked(data.unlocked);
  };

  useEffect(() => {
    setMounted(true);
    refresh().then(() => setLoading(false));
  }, []);

  const handleToggle = (key: string) => {
    startTransition(async () => {
      await toggleAchievementVisibility(key);
      await refresh();
    });
  };

  const handleSyncMastery = () => {
    startTransition(async () => {
      await evaluateMasteryAchievements();
      await refresh();
    });
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  // Build lookup map
  const unlockedMap = new Map(unlocked.map((u) => [u.key, u]));

  const hiddenMetas = ALL_ACHIEVEMENTS.filter((a) => a.type === "hidden");
  const unlockedCount = unlocked.length;
  const completionPct = Math.round((unlockedCount / TOTAL_ALL) * 100);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#050508" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ width: 28, height: 28, border: "1px solid rgba(0,255,255,0.4)", borderTopColor: "#00ffff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "rgba(0,255,255,0.4)", letterSpacing: "0.3em" }}>
            LOADING ACHIEVEMENTS
          </span>
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

        .cp-root::before {
          content: '';
          position: fixed; inset: 0;
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.025) 2px, rgba(0,0,0,0.025) 4px);
          pointer-events: none; z-index: 100;
        }

        .bg-ambient {
          position: fixed; inset: 0;
          background:
            radial-gradient(ellipse 50% 30% at 10% 10%, rgba(0,255,255,0.04) 0%, transparent 70%),
            radial-gradient(ellipse 40% 30% at 90% 90%, rgba(251,191,36,0.03) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }

        /* Sidenav */
        .sidenav-overlay {
          position: fixed; inset: 0; z-index: 150;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          opacity: 0; pointer-events: none;
          transition: opacity 0.3s;
        }
        .sidenav-overlay.open { opacity: 1; pointer-events: all; }

        .sidenav {
          position: fixed; top: 0; left: 0; bottom: 0;
          width: 260px; z-index: 160;
          background: #07070c;
          border-right: 1px solid rgba(0,255,255,0.08);
          padding: 32px 0;
          transform: translateX(-100%);
          transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
          display: flex; flex-direction: column;
        }
        .sidenav.open { transform: translateX(0); }

        .sidenav-logo {
          font-family: 'Share Tech Mono', monospace;
          font-size: 12px; color: rgba(0,255,255,0.4);
          letter-spacing: 0.2em;
          padding: 0 24px 28px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          margin-bottom: 16px;
        }

        .nav-link {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 24px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 14px; font-weight: 500;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: rgba(255,255,255,0.3);
          text-decoration: none;
          transition: color 0.2s, background 0.2s;
          cursor: pointer; border: none; background: none;
          width: 100%; text-align: left;
        }
        .nav-link:hover { color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.03); }
        .nav-link.active { color: #00ffff; background: rgba(0,255,255,0.05); border-left: 2px solid #00ffff; padding-left: 22px; }
        .nav-link.signout { color: rgba(236,72,153,0.5); margin-top: auto; }
        .nav-link.signout:hover { color: rgba(236,72,153,0.9); background: rgba(236,72,153,0.05); }
        .nav-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; opacity: 0.6; flex-shrink: 0; }

        /* Layout */
        .cp-layout {
          position: relative; z-index: 1;
          max-width: 820px; margin: 0 auto;
          padding: 0 20px 80px;
          opacity: 0; transform: translateY(8px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .cp-layout.mounted { opacity: 1; transform: translateY(0); }

        /* Topbar */
        .cp-topbar {
          display: flex; align-items: center; gap: 16px;
          padding: 20px 0 18px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          margin-bottom: 32px;
          position: sticky; top: 0; z-index: 10;
          background: rgba(5,5,8,0.95);
          backdrop-filter: blur(8px);
        }

        .hamburger-btn {
          display: flex; flex-direction: column; gap: 4px;
          background: none; border: none; cursor: pointer; padding: 4px; flex-shrink: 0;
        }
        .hamburger-line {
          width: 18px; height: 1.5px;
          background: rgba(0,255,255,0.6); border-radius: 1px;
          transition: background 0.2s;
        }
        .hamburger-btn:hover .hamburger-line { background: #00ffff; }

        .page-title {
          font-family: 'Share Tech Mono', monospace;
          font-size: 13px; color: rgba(255,255,255,0.7);
          letter-spacing: 0.25em; text-transform: uppercase;
          flex: 1;
        }

        /* Progress strip */
        .progress-strip {
          display: flex; align-items: center; gap: 12px;
          margin-bottom: 32px;
          padding: 16px 14px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 4px;
        }

        .progress-bar-bg {
          flex: 1; height: 2px;
          background: rgba(255,255,255,0.06);
          border-radius: 2px; overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%; border-radius: 2px;
          background: linear-gradient(to right, rgba(0,255,255,0.6), rgba(251,191,36,0.6));
          transition: width 1s ease;
        }

        /* Tabs */
        .tab-row {
          display: flex; gap: 0;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .tab-btn {
          padding: 10px 20px;
          background: none; border: none;
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px; letter-spacing: 0.2em;
          text-transform: uppercase;
          cursor: pointer;
          transition: color 0.2s, border-color 0.2s;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
        }

        .tab-btn.active {
          color: #00ffff;
          border-bottom-color: #00ffff;
        }

        .tab-btn:not(.active) {
          color: rgba(255,255,255,0.25);
        }

        .tab-btn:not(.active):hover {
          color: rgba(255,255,255,0.5);
        }

        /* Grids */
        .mastery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 10px;
        }

        .hidden-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 10px;
        }

        /* Sync button */
        .sync-btn {
          display: flex; align-items: center; gap: 8px;
          margin-top: 24px;
          padding: 10px 16px;
          background: none;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 4px;
          color: rgba(255,255,255,0.3);
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px; letter-spacing: 0.15em;
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s;
          width: fit-content;
        }
        .sync-btn:hover:not(:disabled) {
          border-color: rgba(0,255,255,0.25);
          color: rgba(0,255,255,0.6);
        }
        .sync-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        /* Status bar */
        .cp-statusbar {
          margin-top: 48px;
          padding-top: 14px;
          border-top: 1px solid rgba(255,255,255,0.04);
          display: flex; align-items: center; gap: 16px;
        }

        .cp-status-dot {
          width: 5px; height: 5px; border-radius: 50%;
          animation: pulse-dot 2.5s ease-in-out infinite;
        }

        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="cp-root">
        <div className="bg-ambient" />

        {/* Sidenav */}
        <div className={`sidenav-overlay ${sidenavOpen ? "open" : ""}`} onClick={() => setSidenavOpen(false)} />
        <nav className={`sidenav ${sidenavOpen ? "open" : ""}`}>
          <div className="sidenav-logo">LIFETRACK</div>
          <Link href="/profile"      className="nav-link" onClick={() => setSidenavOpen(false)}><span className="nav-dot" />Profile</Link>
          <Link href="/mission"      className="nav-link" onClick={() => setSidenavOpen(false)}><span className="nav-dot" />Mission Stack</Link>
          <Link href="/achievements" className="nav-link active" onClick={() => setSidenavOpen(false)}><span className="nav-dot" />Achievements</Link>
          <Link href="/battleground" className="nav-link" onClick={() => setSidenavOpen(false)}><span className="nav-dot" />Battle Ground</Link>
          <button className="nav-link signout" onClick={handleSignOut} style={{ marginTop: "auto" }}>
            <span className="nav-dot" />Sign Out
          </button>
        </nav>

        <div className={`cp-layout ${mounted ? "mounted" : ""}`}>

          {/* Topbar */}
          <div className="cp-topbar">
            <button className="hamburger-btn" onClick={() => setSidenavOpen(true)} aria-label="Open menu">
              <div className="hamburger-line" /><div className="hamburger-line" /><div className="hamburger-line" />
            </button>
            <span className="page-title">Achievements</span>
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}>
              {unlockedCount}/{TOTAL_ALL}
            </span>
          </div>

          {/* Progress strip */}
          <div className="progress-strip">
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.15em", flexShrink: 0 }}>
              PROGRESS
            </span>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${completionPct}%` }} />
            </div>
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: completionPct >= 100 ? "#fbbf24" : "rgba(0,255,255,0.6)", letterSpacing: "0.1em", flexShrink: 0 }}>
              {completionPct}%
            </span>
          </div>

          {/* Tabs */}
          <div className="tab-row">
            <button
              className={`tab-btn ${activeTab === "mastery" ? "active" : ""}`}
              onClick={() => setActiveTab("mastery")}
            >
              Mastery ({unlocked.filter(u => u.meta.type === "mastery").length}/28)
            </button>
            <button
              className={`tab-btn ${activeTab === "hidden" ? "active" : ""}`}
              onClick={() => setActiveTab("hidden")}
            >
              Hidden ({unlocked.filter(u => u.meta.type === "hidden").length}/8)
            </button>
          </div>

          {/* Mastery tab */}
          {activeTab === "mastery" && (
            <>
              <div className="mastery-grid">
                {DOMAINS.map((domain) => (
                  <DomainMasteryRow
                    key={domain}
                    domain={domain}
                    unlockedMap={unlockedMap}
                    onToggle={handleToggle}
                    isPending={isPending}
                  />
                ))}
              </div>

              {/* Sync mastery button — manual trigger until cron is wired */}
              <button
                className="sync-btn"
                onClick={handleSyncMastery}
                disabled={isPending}
              >
                {isPending ? "⟳ SYNCING..." : "⟳ SYNC MASTERY"}
              </button>

              <p style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 9, color: "rgba(255,255,255,0.15)",
                letterSpacing: "0.12em", marginTop: 8,
              }}>
                // MASTERY SYNCS DAILY — TAP TO REFRESH MANUALLY
              </p>
            </>
          )}

          {/* Hidden tab */}
          {activeTab === "hidden" && (
            <div className="hidden-grid">
              {hiddenMetas.map((meta) => (
                <HiddenCard
                  key={meta.key}
                  meta={meta}
                  achieved={unlockedMap.get(meta.key)}
                  onToggle={handleToggle}
                  isPending={isPending}
                />
              ))}
            </div>
          )}

          {/* Visibility hint */}
          <p style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 9, color: "rgba(255,255,255,0.15)",
            letterSpacing: "0.12em", marginTop: 24,
          }}>
            // TAP ANY UNLOCKED ACHIEVEMENT TO TOGGLE PUBLIC VISIBILITY
          </p>

          {/* Status bar */}
          <div className="cp-statusbar">
            <div className="cp-status-dot" style={{ background: "rgba(0,255,255,0.6)", boxShadow: "0 0 6px rgba(0,255,255,0.6)" }} />
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.15em" }}>
              {unlockedCount} UNLOCKED · {TOTAL_ALL - unlockedCount} REMAINING
            </span>
          </div>

        </div>
      </div>
    </>
  );
}