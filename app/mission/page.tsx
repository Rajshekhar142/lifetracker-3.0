"use client";

import { useEffect, useState, useTransition, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { signOut } from "better-auth/api";
import type { Domain, Task } from "@/generated/prisma/client";
import {
  getDomainsWithTasks,
  createTask,
  startTaskTimer,
  getElapsedSeconds,
  evaluateRecall,
  completeTask,
  failTask,
  updateTask,
  deleteTask,
} from "@/app/actions/mission-actions";
import { AchievementToast } from "@/components/Achievementtoast";
import { checkAchievementsOnComplete } from "../actions/achievement-store";



// ─── Types ────────────────────────────────────────────────────────────────────
type DomainWithTasks = Domain & {
  tasks: Task[];
  totalWU: number;
  claimedWU: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const REFLECTION_DOMAINS = ["Physical", "Vocational"];
const ACCENT_MAP: Record<string, string> = {
  Physical:   "cyan",
  Mental:     "violet",
  Emotional:  "pink",
  Spiritual:  "cyan",
  Social:     "violet",
  Financial:  "pink",
  Vocational: "cyan",
};

const ACCENTS = {
  cyan:    { primary: "#00ffff", glow: "rgba(0,255,255,",   muted: "rgba(0,255,255,0.15)"   },
  violet:  { primary: "#a78bfa", glow: "rgba(139,92,246,",  muted: "rgba(139,92,246,0.15)"  },
  pink:    { primary: "#f472b6", glow: "rgba(236,72,153,",  muted: "rgba(236,72,153,0.15)"  },
  neutral: { primary: "#94a3b8", glow: "rgba(148,163,184,", muted: "rgba(148,163,184,0.15)" },
};

function getAccent(name: string) {
  const key = (ACCENT_MAP[name] ?? "neutral") as keyof typeof ACCENTS;
  return ACCENTS[key];
}

// ─── Polygon SVG ─────────────────────────────────────────────────────────────
function LifePolygon({ domains }: { domains: DomainWithTasks[] }) {
  const n = domains.length;
  if (n < 3) return null;

  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const R = 88;

  // Vertices of the polygon
  const vertices = Array.from({ length: n }, (_, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) };
  });

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      style={{ width: "100%", maxWidth: 320, display: "block", margin: "0 auto" }}
    >
      {/* Background polygon */}
      <polygon
        points={vertices.map((v) => `${v.x},${v.y}`).join(" ")}
        fill="rgba(255,255,255,0.02)"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="1"
      />

      {/* Segment for each domain */}
      {domains.map((domain, i) => {
        const accent = getAccent(domain.name);
        const progress = domain.totalWU > 0 ? Math.min(domain.claimedWU / domain.totalWU, 1) : 0;
        const opacity = 0.12 + progress * 0.72; // 0.12 at 0% → 0.84 at 100%

        const v1 = vertices[i];
        const v2 = vertices[(i + 1) % n];

        // Segment: center → v1 → v2
        const pathD = `M ${cx},${cy} L ${v1.x},${v1.y} L ${v2.x},${v2.y} Z`;

        return (
          <g key={domain.id}>
            <path
              d={pathD}
              fill={`${accent.glow}${opacity})`}
              stroke="rgba(0,0,0,0.4)"
              strokeWidth="0.5"
            />
            {/* Domain label */}
            {(() => {
              const midAngle = (2 * Math.PI * (i + 0.5)) / n - Math.PI / 2;
              const labelR = R * 0.62;
              const lx = cx + labelR * Math.cos(midAngle);
              const ly = cy + labelR * Math.sin(midAngle);
              return (
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={accent.primary}
                  fontSize="6.5"
                  fontFamily="'Share Tech Mono', monospace"
                  opacity={0.7 + progress * 0.3}
                  style={{ userSelect: "none" }}
                >
                  {domain.name.toUpperCase().slice(0, 4)}
                </text>
              );
            })()}
          </g>
        );
      })}

      {/* Outer border */}
      <polygon
        points={vertices.map((v) => `${v.x},${v.y}`).join(" ")}
        fill="none"
        stroke="rgba(0,255,255,0.15)"
        strokeWidth="0.8"
      />

      {/* Center dot */}
      <circle cx={cx} cy={cy} r="2.5" fill="rgba(0,255,255,0.4)" />
    </svg>
  );
}

// ─── Timer display ────────────────────────────────────────────────────────────
function TimerDisplay({ startedAt }: { startedAt: Date | null }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) { setElapsed(0); return; }
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const fmt = (n: number) => String(n).padStart(2, "0");

  return (
    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "rgba(0,255,255,0.7)", letterSpacing: "0.1em" }}>
      {h > 0 && `${fmt(h)}:`}{fmt(m)}:{fmt(s)}
    </span>
  );
}

// ─── Recall popup ─────────────────────────────────────────────────────────────
function RecallPopup({
  task,
  domainName,
  useAI,
  onResult,
  onCancel,
}: {
  task: Task;
  domainName: string;
  useAI: boolean;
  onResult: (multiplier: number, feedback: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ multiplier: number; feedback: string } | null>(null);
  const isReflection = REFLECTION_DOMAINS.includes(domainName);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    const res = await evaluateRecall({
      taskId: task.id,
      taskTitle: task.title,
      domainName,
      recallText: text,
      useAI,
    });
    setResult(res);
    setLoading(false);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.85)",
      backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        width: "100%", maxWidth: 480,
        background: "#0a0a0f",
        border: "1px solid rgba(0,255,255,0.2)",
        borderRadius: 6,
        padding: "28px 24px",
        boxShadow: "0 0 40px rgba(0,255,255,0.08)",
      }}>
        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "rgba(0,255,255,0.4)", letterSpacing: "0.3em", marginBottom: 16 }}>
          // {isReflection ? "REFLECTION CHECK" : "RECALL CHECK"}
        </div>

        <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 6, fontFamily: "'Rajdhani', sans-serif", letterSpacing: "0.05em" }}>
          {task.title}
        </div>

        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 20, fontFamily: "'Rajdhani', sans-serif", lineHeight: 1.5 }}>
          {isReflection
            ? "How did it feel? What did your body/work experience tell you? What did you push through?"
            : "Explain what you learned or did — in your own words. Don't look it up."}
        </div>

        {!result ? (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={isReflection ? "Reflect on your experience..." : "Explain it like you're teaching someone..."}
              rows={4}
              autoFocus
              style={{
                width: "100%", background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4,
                padding: "10px 12px", color: "#e2e8f0",
                fontFamily: "'Rajdhani', sans-serif", fontSize: 14,
                lineHeight: 1.6, resize: "none", outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(0,255,255,0.3)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                onClick={handleSubmit}
                disabled={!text.trim() || loading}
                style={{
                  flex: 1, padding: "11px 0",
                  background: "rgba(0,255,255,0.08)",
                  border: "1px solid rgba(0,255,255,0.35)",
                  borderRadius: 4, color: "#00ffff",
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: 13, fontWeight: 700,
                  letterSpacing: "0.12em", cursor: "pointer",
                  opacity: (!text.trim() || loading) ? 0.4 : 1,
                }}
              >
                {loading ? "EVALUATING..." : "SUBMIT"}
              </button>
              <button
                onClick={onCancel}
                style={{
                  padding: "11px 16px",
                  background: "none",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 4, color: "rgba(255,255,255,0.3)",
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 11, cursor: "pointer",
                }}
              >
                CANCEL
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{
              fontSize: 40, fontWeight: 700, fontFamily: "'Rajdhani', sans-serif",
              color: result.multiplier >= 1.0 ? "#00ffff" : "#f59e0b",
              letterSpacing: "-0.02em", marginBottom: 8,
            }}>
              {result.multiplier === 1.0 ? "1.0×" : result.multiplier === 0.75 ? "0.75×" : "0.5×"}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 20, fontFamily: "'Rajdhani', sans-serif" }}>
              {result.feedback}
            </div>
            <button
              onClick={() => onResult(result.multiplier, result.feedback)}
              style={{
                width: "100%", padding: "12px 0",
                background: result.multiplier >= 1.0 ? "rgba(0,255,255,0.08)" : "rgba(245,158,11,0.08)",
                border: `1px solid ${result.multiplier >= 1.0 ? "rgba(0,255,255,0.4)" : "rgba(245,158,11,0.4)"}`,
                borderRadius: 4,
                color: result.multiplier >= 1.0 ? "#00ffff" : "#f59e0b",
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: 14, fontWeight: 700, letterSpacing: "0.12em",
                cursor: "pointer",
              }}
            >
              CONFIRM & COMPLETE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Task row ─────────────────────────────────────────────────────────────────
function TaskRow({
  task,
  domainName,
  accentColor,
  useAI,
  onUpdate,
}: {
  task: Task;
  domainName: string;
  accentColor: ReturnType<typeof getAccent>;
  useAI: boolean;
  onUpdate: () => void;
}) {
  const[newAchievements, setNewAchievements]= useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [showRecall, setShowRecall] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isActive = task.status === "In_progress";
  const isRunning = isActive && !!task.startedAt;
  const isDone = task.status === "Completed";
  const isFailed = task.status === "Failed";

  const handleStart = () => {
    startTransition(async () => {
      await startTaskTimer(task.id);
      onUpdate();
    });
  };

  const handleComplete = () => setShowRecall(true);

  const handleRecallResult = (multiplier: number) => {
    startTransition(async () => {
      await completeTask({ taskId: task.id, recallMultiplier: multiplier });
      const unlocked = await checkAchievementsOnComplete(task.id);
      if(unlocked.length) setNewAchievements(unlocked);
      setShowRecall(false);
      onUpdate();
    });
  };

  const handleFail = () => {
    startTransition(async () => {
      await failTask(task.id);
      onUpdate();
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteTask(task.id);
      onUpdate();
    });
  };

  const handleSaveEdit = () => {
    if (!editTitle.trim()) return;
    startTransition(async () => {
      await updateTask(task.id, { title: editTitle });
      setEditing(false);
      onUpdate();
    });
  };

  const resistanceMult = task.resistanceLevel >= 7 ? "4×" : task.resistanceLevel >= 4 ? "2×" : "1×";

  return (
    <>
      {showRecall && (
        <RecallPopup
          task={task}
          domainName={domainName}
          useAI={useAI}
          onResult={handleRecallResult}
          onCancel={() => setShowRecall(false)}
        />
      )}

      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        opacity: isPending ? 0.5 : 1,
        transition: "opacity 0.2s",
      }}>
        {/* Main row */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 0", cursor: "pointer",
          }}
          onClick={() => setExpanded((v) => !v)}
        >
          {/* Status indicator */}
          <div style={{
            width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
            background: isDone
              ? accentColor.primary
              : isFailed
              ? "#ef4444"
              : isRunning
              ? "#00ffff"
              : "rgba(255,255,255,0.15)",
            boxShadow: isRunning ? `0 0 6px ${accentColor.primary}` : "none",
            transition: "all 0.3s",
          }} />

          {/* Title */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") setEditing(false); }}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                style={{
                  width: "100%", background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(0,255,255,0.3)", borderRadius: 3,
                  padding: "3px 8px", color: "#00ffff",
                  fontFamily: "'Rajdhani', sans-serif", fontSize: 13,
                  fontWeight: 600, outline: "none",
                }}
              />
            ) : (
              <span style={{
                fontSize: 13, fontWeight: 600,
                fontFamily: "'Rajdhani', sans-serif",
                letterSpacing: "0.04em",
                color: isDone ? "rgba(255,255,255,0.4)" : isFailed ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.75)",
                textDecoration: isDone ? "line-through" : "none",
              }}>
                {task.title}
              </span>
            )}
          </div>

          {/* Meta */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {isRunning && <TimerDisplay startedAt={task.startedAt} />}
            {isDone && (
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: accentColor.primary, opacity: 0.8 }}>
                {task.calculatedWU.toFixed(1)} WU
              </span>
            )}
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>
              R:{task.resistanceLevel} {resistanceMult}
            </span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none" }}>▾</span>
          </div>
        </div>

        {/* Expanded actions */}
        {expanded && (
          <div style={{
            padding: "0 0 12px 16px",
            display: "flex", gap: 8, flexWrap: "wrap",
          }}>
            {isActive && !isRunning && (
              <ActionBtn color={accentColor.primary} onClick={handleStart}>▶ START</ActionBtn>
            )}
            {isRunning && (
              <ActionBtn color={accentColor.primary} onClick={handleComplete}>✓ COMPLETE</ActionBtn>
            )}
            {isActive && (
              <ActionBtn color="#ef4444" onClick={handleFail}>✕ FAIL</ActionBtn>
            )}
            {!editing && (
              <ActionBtn color="rgba(255,255,255,0.3)" onClick={(e) => { e.stopPropagation(); setEditing(true); }}>✎ EDIT</ActionBtn>
            )}
            {editing && (
              <ActionBtn color={accentColor.primary} onClick={handleSaveEdit}>↵ SAVE</ActionBtn>
            )}
            <ActionBtn color="rgba(239,68,68,0.4)" onClick={handleDelete}>⌫ DELETE</ActionBtn>
          </div>
        )}
      </div>
    </>
  );
}

function ActionBtn({ color, onClick, children }: { color: string; onClick: (e: React.MouseEvent) => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px",
        background: "none",
        border: `1px solid ${color}`,
        borderRadius: 3,
        color,
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: 9,
        letterSpacing: "0.1em",
        cursor: "pointer",
        transition: "background 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = `${color}22`)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
    >
      {children}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MissionPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [domains, setDomains]             = useState<DomainWithTasks[]>([]);
  const [loading, setLoading]             = useState(true);
  const [mounted, setMounted]             = useState(false);
  const [sidenavOpen, setSidenavOpen]     = useState(false);
  const [newAchievements, setNewAchievements]= useState<string[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [taskInput, setTaskInput]         = useState("");
  const [resistance, setResistance]       = useState(5);
  const [useAI, setUseAI]                 = useState(true);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [isPending, startTransition]      = useTransition();

  const refresh = useCallback(async () => {
    const data = await getDomainsWithTasks();
    setDomains(data);
  }, []);

  useEffect(() => {
    setMounted(true);
    refresh().then(() => setLoading(false));
  }, [refresh]);

  const toggleDomain = (id: string) => {
    setSelectedDomain((prev) => (prev === id ? null : id));
  };

  const toggleExpand = (id: string) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreateTask = () => {
    if (!taskInput.trim() || !selectedDomain) return;
    startTransition(async () => {
      await createTask({ title: taskInput, domainId: selectedDomain, resistanceLevel: resistance });
      setTaskInput("");
      await refresh();
    });
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  const selectedDomainData = domains.find((d) => d.id === selectedDomain);
  const totalWU = domains.reduce((s, d) => s + d.claimedWU, 0);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#050508" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ width: 28, height: 28, border: "1px solid rgba(0,255,255,0.4)", borderTopColor: "#00ffff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "rgba(0,255,255,0.4)", letterSpacing: "0.3em" }}>LOADING MISSIONS</span>
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
          pointer-events: none;
          z-index: 100;
        }

        .bg-ambient {
          position: fixed; inset: 0;
          background:
            radial-gradient(ellipse 50% 30% at 10% 10%, rgba(0,255,255,0.05) 0%, transparent 70%),
            radial-gradient(ellipse 40% 30% at 90% 90%, rgba(139,92,246,0.04) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }

        /* Sidenav overlay */
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
          cursor: pointer; border: none; background: none; width: 100%; text-align: left;
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
          background: none; border: none; cursor: pointer; padding: 4px;
          flex-shrink: 0;
        }
        .hamburger-line {
          width: 18px; height: 1.5px;
          background: rgba(0,255,255,0.6);
          border-radius: 1px;
          transition: background 0.2s;
        }
        .hamburger-btn:hover .hamburger-line { background: #00ffff; }

        .page-title {
          font-family: 'Share Tech Mono', monospace;
          font-size: 13px; color: rgba(255,255,255,0.7);
          letter-spacing: 0.25em; text-transform: uppercase;
          flex: 1;
        }

        .total-wu {
          font-family: 'Share Tech Mono', monospace;
          font-size: 11px; color: rgba(0,255,255,0.5);
          letter-spacing: 0.1em;
        }

        /* Polygon section */
        .polygon-section {
          margin-bottom: 36px;
          display: flex; flex-direction: column; align-items: center; gap: 12px;
        }

        .polygon-label {
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; color: rgba(255,255,255,0.15);
          letter-spacing: 0.3em; text-transform: uppercase;
        }

        /* Domain list */
        .domains-label {
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px; color: rgba(255,255,255,0.18);
          letter-spacing: 0.3em; margin-bottom: 12px;
        }

        .domain-row {
          border-radius: 4px;
          margin-bottom: 6px;
          transition: background 0.2s, border-color 0.2s;
          overflow: hidden;
        }

        .domain-row-header {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px; cursor: pointer;
          border-radius: 4px;
        }

        .domain-row-icon {
          font-size: 14px; flex-shrink: 0;
        }

        .domain-row-name {
          flex: 1;
          font-size: 14px; font-weight: 600;
          letter-spacing: 0.1em; text-transform: uppercase;
          transition: color 0.2s;
        }

        .domain-wu-badge {
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px; color: rgba(255,255,255,0.25);
          letter-spacing: 0.08em;
        }

        .domain-expand-arrow {
          font-size: 10px; color: rgba(255,255,255,0.2);
          transition: transform 0.2s;
          flex-shrink: 0;
        }

        .domain-tasks-panel {
          padding: 4px 14px 8px 36px;
        }

        /* Task input */
        .task-input-section {
          position: sticky; bottom: 0; z-index: 10;
          background: rgba(5,5,8,0.97);
          backdrop-filter: blur(10px);
          border-top: 1px solid rgba(255,255,255,0.05);
          padding: 16px 0 20px;
          margin-top: 24px;
        }

        .task-input-domain-hint {
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.2em;
          margin-bottom: 10px;
          transition: color 0.3s;
        }

        .task-input-row {
          display: flex; gap: 8px; align-items: center; justify-content: center;
        }

        .task-input {
          flex: 1;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 4px;
          padding: 11px 14px;
          color: #e2e8f0;
          font-family: 'Rajdhani', sans-serif;
          font-size: 14px; font-weight: 500;
          letter-spacing: 0.04em;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .task-input:focus {
          border-color: rgba(0,255,255,0.3);
          box-shadow: 0 0 12px rgba(0,255,255,0.06);
        }
        .task-input::placeholder { color: rgba(255,255,255,0.18); }
        .task-input:disabled { opacity: 0.3; cursor: not-allowed; }

        .resistance-wrap {
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          flex-shrink: 0;
        }
        .resistance-label {
          font-family: 'Share Tech Mono', monospace;
          font-size: 8px; color: rgba(255,255,255,0.25);
          letter-spacing: 0.1em;
        }
        .resistance-input {
          width: 48px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 4px;
          padding: 10px 8px;
          color: #e2e8f0;
          font-family: 'Share Tech Mono', monospace;
          font-size: 13px; text-align: center;
          outline: none;
        }
        .resistance-input:focus { border-color: rgba(0,255,255,0.3); }

        .add-btn {
          padding: 11px 18px;
          background: rgba(0,255,255,0.06);
          border: 1px solid rgba(0,255,255,0.3);
          border-radius: 4px;
          color: #00ffff;
          font-family: 'Share Tech Mono', monospace;
          font-size: 11px; letter-spacing: 0.1em;
          cursor: pointer; flex-shrink: 0;
          transition: background 0.2s, border-color 0.2s;
        }
        .add-btn:hover:not(:disabled) {
          background: rgba(0,255,255,0.12);
          border-color: rgba(0,255,255,0.55);
        }
        .add-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .ai-toggle {
          display: flex; align-items: center; gap: 6px;
          margin-top: 8px;
          cursor: pointer; width: fit-content;
        }
        .ai-toggle-box {
          width: 28px; height: 14px; border-radius: 7px;
          border: 1px solid rgba(0,255,255,0.3);
          position: relative; transition: background 0.2s;
        }
        .ai-toggle-knob {
          position: absolute; top: 2px;
          width: 8px; height: 8px; border-radius: 50%;
          background: #00ffff;
          transition: left 0.2s;
        }
        .ai-toggle-label {
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; color: rgba(255,255,255,0.25);
          letter-spacing: 0.15em;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="cp-root">
        <div className="bg-ambient" />

        {/* Sidenav */}
        <div className={`sidenav-overlay ${sidenavOpen ? "open" : ""}`} onClick={() => setSidenavOpen(false)} />
        <nav className={`sidenav ${sidenavOpen ? "open" : ""}`}>
          <div className="sidenav-logo">LIFETRACK</div>

          <Link href="/profile" className="nav-link" onClick={() => setSidenavOpen(false)}>
            <span className="nav-dot" />Profile
          </Link>
          <Link href="/mission" className="nav-link active" onClick={() => setSidenavOpen(false)}>
            <span className="nav-dot" />Mission Stack
          </Link>
          <Link href="/achievements" className="nav-link" onClick={() => setSidenavOpen(false)}>
            <span className="nav-dot" />Achievements
          </Link>
          <Link href="/battleground" className="nav-link" onClick={() => setSidenavOpen(false)}>
            <span className="nav-dot" />Battle Ground
          </Link>

          <button className="nav-link signout" onClick={handleSignOut} style={{ marginTop: "auto" }}>
            <span className="nav-dot" />Sign Out
          </button>
        </nav>

        <div className={`cp-layout ${mounted ? "mounted" : ""}`}>

          {/* Topbar */}
          <div className="cp-topbar">
            <button className="hamburger-btn" onClick={() => setSidenavOpen(true)} aria-label="Open menu">
              <div className="hamburger-line" />
              <div className="hamburger-line" />
              <div className="hamburger-line" />
            </button>
            <span className="page-title">Mission Stack</span>
            <span className="total-wu">{totalWU.toFixed(1)} WU TOTAL</span>
          </div>

          {/* Polygon */}
          {domains.length >= 3 && (
            <div className="polygon-section">
              <LifePolygon domains={domains} />
              <span className="polygon-label">
                {domains.length}-domain life architecture · {domains.filter(d => d.claimedWU > 0).length} active
              </span>
            </div>
          )}

          {/* Domain list */}
          <div className="domains-label">// YOUR DOMAINS</div>

          {domains.map((domain) => {
            const accent = getAccent(domain.name);
            const isSelected = selectedDomain === domain.id;
            const isExpanded = expandedDomains.has(domain.id);
            const activeTasks = domain.tasks.filter(t => t.status === "In_progress");
            const completedTasks = domain.tasks.filter(t => t.status === "Completed");

            return (
              <div
                key={domain.id}
                className="domain-row"
                style={{
                  border: `1px solid ${isSelected ? `${accent.glow}0.35)` : "rgba(255,255,255,0.05)"}`,
                  background: isSelected ? `${accent.glow}0.04)` : "rgba(255,255,255,0.01)",
                  boxShadow: isSelected ? `0 0 16px ${accent.glow}0.08)` : "none",
                }}
              >
                <div className="domain-row-header">
                  {/* Select toggle */}
                  <div
                    onClick={() => toggleDomain(domain.id)}
                    style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}
                  >
                    <span className="domain-row-icon" style={{ color: `${accent.glow}0.6)` }}>
                      {domain.icon ?? "◌"}
                    </span>
                    <span className="domain-row-name" style={{ color: isSelected ? accent.primary : "rgba(255,255,255,0.55)" }}>
                      {domain.name}
                    </span>
                  </div>

                  <span className="domain-wu-badge">
                    {domain.claimedWU.toFixed(1)}/{domain.totalWU.toFixed(1)} WU
                  </span>

                  {/* Expand tasks */}
                  <div
                    onClick={() => toggleExpand(domain.id)}
                    style={{ padding: "4px 6px", cursor: "pointer" }}
                  >
                    <span
                      className="domain-expand-arrow"
                      style={{ transform: isExpanded ? "rotate(180deg)" : "none", display: "block" }}
                    >
                      ▾
                    </span>
                  </div>
                </div>

                {/* Tasks panel */}
                {isExpanded && (
                  <div className="domain-tasks-panel">
                    {domain.tasks.length === 0 ? (
                      <div style={{
                        fontFamily: "'Share Tech Mono', monospace",
                        fontSize: 10, color: "rgba(255,255,255,0.15)",
                        letterSpacing: "0.15em", padding: "8px 0 4px",
                      }}>
                        // NO MISSIONS YET — SELECT DOMAIN AND LOG ONE BELOW
                      </div>
                    ) : (
                      domain.tasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          domainName={domain.name}
                          accentColor={accent}
                          useAI={useAI}
                          onUpdate={refresh}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Task input */}
          <div className="task-input-section">
            <div
              className="task-input-domain-hint"
              style={{ color: selectedDomainData ? getAccent(selectedDomainData.name).primary : "rgba(255,255,255,0.2)" }}
            >
              {selectedDomainData
                ? `// LOGGING TO: ${selectedDomainData.name.toUpperCase()}`
                : "// SELECT A DOMAIN ABOVE TO LOG A MISSION"}
            </div>

            <div className="task-input-row">
              <input
                className="task-input"
                placeholder={selectedDomain ? "Mission title..." : "Select a domain first..."}
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateTask(); }}
                disabled={!selectedDomain}
              />
              <div className="resistance-wrap">
                <input
                  type="number"
                  placeholder="resistance.."
                  className="resistance-input"
                  min={1} max={10}
                  value={resistance}
                  onChange={(e) => setResistance(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                  disabled={!selectedDomain}
                />
              </div>
              <button
                className="add-btn"
                onClick={handleCreateTask}
                disabled={!selectedDomain || !taskInput.trim() || isPending}
              >
                + LOG
              </button>
            </div>

            {/* AI toggle */}
            <div className="ai-toggle" onClick={() => setUseAI((v) => !v)}>
              <div className="ai-toggle-box" style={{ background: useAI ? "rgba(0,255,255,0.15)" : "transparent" }}>
                <div className="ai-toggle-knob" style={{ left: useAI ? 16 : 2, background: useAI ? "#00ffff" : "rgba(255,255,255,0.3)" }} />
              </div>
              <span className="ai-toggle-label">{useAI ? "AI RECALL EVAL" : "SIMPLE EVAL"}</span>
            </div>
          </div>

        </div>
      </div>
      <AchievementToast newKeys={newAchievements} onDismiss={()=> setNewAchievements([])}/>
    </>
  );
}