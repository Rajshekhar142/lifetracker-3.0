"use client";

import { useState, useEffect, useTransition } from "react";
import {
  getUserNetworks,
  createNetwork,
  getNetworkLeaderboard,
  getNetworkDuels,
  initiateDuel,
  acceptDuel,
  declineDuel,
  leaveNetwork,
  deleteNetwork,
  resolveExpiredDuels,
} from "@/app/actions/network-actions";
import type {
  NetworkWithMeta,
  LeaderboardEntry,
  DuelWithMeta,
} from "@/app/actions/network-actions";

const DOMAINS = [
  "Physical", "Mental", "Emotional",
  "Spiritual", "Social", "Financial", "Vocational",
];

const DOMAIN_COLORS: Record<string, string> = {
  Physical:   "#00ffff",
  Mental:     "#a78bfa",
  Emotional:  "#f472b6",
  Spiritual:  "#34d399",
  Social:     "#fbbf24",
  Financial:  "#60a5fa",
  Vocational: "#fb923c",
};

const TIER_COLORS: Record<string, string> = {
  ELITE:      "#fbbf24",
  OPERATOR:   "#00ffff",
  APPRENTICE: "#a78bfa",
  NOVICE:     "rgba(255,255,255,0.4)",
};

export default function NetworkPage() {
  const [networks, setNetworks]           = useState<NetworkWithMeta[]>([]);
  const [selected, setSelected] = useState<NetworkWithMeta | null>();
  const [leaderboard, setLeaderboard]     = useState<LeaderboardEntry[]>([]);
  const [duels, setDuels]                 = useState<DuelWithMeta[]>([]);
  const [view, setView]                   = useState<"boards" | "duels">("boards");
  const [showCreate, setShowCreate]       = useState(false);
  const [showDuelForm, setShowDuelForm]   = useState(false);
  const [loading, setLoading]             = useState(true);
  const [isPending, startTransition]      = useTransition();

  // Create form
  const [newName, setNewName]     = useState("");
  const [newDomain, setNewDomain] = useState(DOMAINS[0]);

  // Duel form
  const [duelTarget, setDuelTarget]   = useState("");
  const [duelDomain, setDuelDomain]   = useState(DOMAINS[0]);
  const [duelBet, setDuelBet]         = useState("");
  const [acceptBet, setAcceptBet]     = useState("");
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  // Copy invite link state
  const [copied, setCopied] = useState<string | null>(null);

  async function refresh() {
    const data = await getUserNetworks();
    setNetworks(data);
    setLoading(false);
  }

  async function loadNetwork(network: NetworkWithMeta) {
    setSelected(network);
    setView("boards");
    startTransition(async () => {
      await resolveExpiredDuels(network.id);
      const [lb, ds] = await Promise.all([
        getNetworkLeaderboard(network.id),
        getNetworkDuels(network.id),
      ]);
      setLeaderboard(lb);
      setDuels(ds);
    });
  }

  useEffect(() => { refresh(); }, []);

  function handleCopyInvite(code: string) {
    const url = `${window.location.origin}/network/join/${code}`;
    navigator.clipboard.writeText(url);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  function handleCreate() {
    if (!newName.trim()) return;
    startTransition(async () => {
      await createNetwork(newName.trim(), newDomain);
      setNewName(""); setNewDomain(DOMAINS[0]);
      setShowCreate(false);
      await refresh();
    });
  }

  function handleInitiateDuel() {
    if (!selected || !duelTarget || !duelBet) return;
    startTransition(async () => {
      await initiateDuel(selected.id, duelTarget, duelDomain, parseFloat(duelBet));
      setShowDuelForm(false);
      setDuelTarget(""); setDuelBet("");
      const ds = await getNetworkDuels(selected.id);
      setDuels(ds);
    });
  }

  function handleAcceptDuel(duelId: string) {
    if (!acceptBet || !selected) return;
    startTransition(async () => {
      await acceptDuel(duelId, parseFloat(acceptBet));
      setAcceptingId(null); setAcceptBet("");
      const ds = await getNetworkDuels(selected.id);
      setDuels(ds);
    });
  }

  function handleDeclineDuel(duelId: string) {
    if (!selected) return;
    startTransition(async () => {
      await declineDuel(duelId);
      const ds = await getNetworkDuels(selected.id);
      setDuels(ds);
    });
  }

  function handleLeave(networkId: string) {
    startTransition(async () => {
      await leaveNetwork(networkId);
      setSelected(null);
      await refresh();
    });
  }

  function handleDelete(networkId: string) {
    startTransition(async () => {
      await deleteNetwork(networkId);
      setSelected(null);
      await refresh();
    });
  }

  const accentColor = selected ? DOMAIN_COLORS[selected.domain] : "#00ffff";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .np-root {
          min-height: 100vh;
          background: #050508;
          color: rgba(255,255,255,0.75);
          font-family: 'Rajdhani', sans-serif;
          padding: 0 0 80px;
        }

        /* ── Topbar ── */
        .np-topbar {
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 18px 24px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          position: sticky; top: 0; z-index: 10;
          background: rgba(5,5,8,0.95);
          backdrop-filter: blur(12px);
        }

        .np-back {
          background: none; border: none; cursor: pointer;
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px; letter-spacing: 0.2em;
          color: rgba(255,255,255,0.25);
          transition: color 0.2s; padding: 4px 0;
        }
        .np-back:hover { color: rgba(255,255,255,0.6); }

        .np-page-title {
          font-family: 'Share Tech Mono', monospace;
          font-size: 11px; letter-spacing: 0.3em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
        }

        .np-create-btn {
          padding: 8px 14px;
          background: rgba(0,255,255,0.07);
          border: 1px solid rgba(0,255,255,0.22);
          border-radius: 3px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: rgba(0,255,255,0.7);
          cursor: pointer; transition: all 0.2s;
        }
        .np-create-btn:hover {
          background: rgba(0,255,255,0.12);
          border-color: rgba(0,255,255,0.4);
        }

        /* ── Body layout ── */
        .np-body { padding: 24px 20px; max-width: 640px; margin: 0 auto; }

        /* ── Network list ── */
        .np-list-label {
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.3em;
          color: rgba(255,255,255,0.2);
          text-transform: uppercase;
          margin-bottom: 14px;
        }

        .np-network-card {
          width: 100%;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 10px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          display: block;
        }
        .np-network-card:hover {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.14);
        }
        .np-network-card.active {
          border-color: var(--accent);
          background: rgba(255,255,255,0.03);
        }

        .np-card-top {
          display: flex; align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .np-card-name {
          font-size: 17px; font-weight: 700;
          letter-spacing: 0.04em;
          color: rgba(255,255,255,0.85);
        }

        .np-domain-badge {
          padding: 3px 9px;
          border-radius: 2px;
          font-family: 'Share Tech Mono', monospace;
          font-size: 8px; letter-spacing: 0.15em;
          text-transform: uppercase;
          border: 1px solid var(--badge-color);
          color: var(--badge-color);
          background: rgba(255,255,255,0.02);
        }

        .np-card-meta {
          display: flex; align-items: center; gap: 14px;
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.12em;
          color: rgba(255,255,255,0.2);
          text-transform: uppercase;
        }

        .np-owner-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: rgba(0,255,255,0.5);
          display: inline-block; margin-right: 4px;
          vertical-align: middle;
        }

        /* ── Empty state ── */
        .np-empty {
          text-align: center; padding: 48px 0;
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px; letter-spacing: 0.2em;
          color: rgba(255,255,255,0.12);
          text-transform: uppercase;
          line-height: 2;
        }

        /* ── Create form ── */
        .np-form-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(0,255,255,0.15);
          border-radius: 6px;
          padding: 20px;
          margin-bottom: 16px;
        }

        .np-form-label {
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.25em;
          color: rgba(255,255,255,0.2);
          text-transform: uppercase;
          margin-bottom: 8px;
          display: block;
        }

        .np-input {
          width: 100%;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 3px;
          padding: 10px 12px;
          color: rgba(255,255,255,0.8);
          font-family: 'Rajdhani', sans-serif;
          font-size: 15px;
          outline: none; margin-bottom: 14px;
          transition: border-color 0.2s;
        }
        .np-input:focus { border-color: rgba(0,255,255,0.3); }
        .np-input::placeholder { color: rgba(255,255,255,0.18); }

        .np-domain-grid {
          display: flex; flex-wrap: wrap; gap: 6px;
          margin-bottom: 16px;
        }

        .np-domain-pill {
          padding: 6px 12px;
          border-radius: 2px;
          border: 1px solid rgba(255,255,255,0.08);
          background: none;
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer; transition: all 0.18s;
          color: rgba(255,255,255,0.3);
        }
        .np-domain-pill.selected {
          border-color: var(--pill-color);
          color: var(--pill-color);
          background: rgba(255,255,255,0.02);
        }

        .np-form-actions {
          display: flex; gap: 8px;
        }

        .np-btn-primary {
          flex: 1; padding: 11px;
          background: rgba(0,255,255,0.08);
          border: 1px solid rgba(0,255,255,0.28);
          border-radius: 3px;
          color: rgba(0,255,255,0.8);
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          cursor: pointer; transition: all 0.2s;
        }
        .np-btn-primary:hover:not(:disabled) {
          background: rgba(0,255,255,0.13);
          border-color: rgba(0,255,255,0.45);
        }
        .np-btn-primary:disabled { opacity: 0.35; cursor: not-allowed; }

        .np-btn-ghost {
          padding: 11px 16px;
          background: none;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 3px;
          color: rgba(255,255,255,0.25);
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px; font-weight: 600;
          letter-spacing: 0.1em; text-transform: uppercase;
          cursor: pointer; transition: all 0.2s;
        }
        .np-btn-ghost:hover { color: rgba(255,255,255,0.5); border-color: rgba(255,255,255,0.15); }

        /* ── Network interior ── */
        .np-interior-header {
          margin-bottom: 20px;
        }

        .np-interior-name {
          font-size: 24px; font-weight: 700;
          letter-spacing: 0.03em;
          color: rgba(255,255,255,0.9);
          margin-bottom: 6px;
        }

        .np-interior-meta {
          display: flex; align-items: center;
          gap: 14px; flex-wrap: wrap;
        }

        .np-interior-tabs {
          display: flex;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          margin-bottom: 22px;
        }

        .np-tab {
          padding: 9px 16px;
          background: none; border: none;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.2em;
          text-transform: uppercase;
          cursor: pointer; transition: all 0.2s;
          color: rgba(255,255,255,0.2);
        }
        .np-tab:hover { color: rgba(255,255,255,0.45); }
        .np-tab.active {
          color: var(--accent);
          border-bottom-color: var(--accent);
        }

        /* ── Leaderboard ── */
        .np-lb-row {
          display: flex; align-items: center;
          padding: 12px 14px;
          border-radius: 4px;
          margin-bottom: 6px;
          transition: background 0.2s;
          gap: 12px;
        }
        .np-lb-row:hover { background: rgba(255,255,255,0.02); }
        .np-lb-row.you { background: rgba(255,255,255,0.025); }

        .np-rank {
          font-family: 'Share Tech Mono', monospace;
          font-size: 11px; letter-spacing: 0.1em;
          width: 24px; flex-shrink: 0; text-align: center;
        }
        .np-rank.first  { color: #fbbf24; }
        .np-rank.second { color: rgba(255,255,255,0.5); }
        .np-rank.third  { color: rgba(205,127,50,0.7); }
        .np-rank.other  { color: rgba(255,255,255,0.2); }

        .np-lb-name {
          flex: 1; font-size: 15px; font-weight: 600;
          letter-spacing: 0.03em; color: rgba(255,255,255,0.75);
        }
        .np-lb-name.you { color: var(--accent); }

        .np-tier-badge {
          font-family: 'Share Tech Mono', monospace;
          font-size: 8px; letter-spacing: 0.15em;
          padding: 2px 6px;
          border-radius: 2px;
          border: 1px solid var(--tier-color);
          color: var(--tier-color);
        }

        .np-lb-wu {
          font-family: 'Share Tech Mono', monospace;
          font-size: 11px; letter-spacing: 0.08em;
          text-align: right; flex-shrink: 0;
          color: rgba(255,255,255,0.45);
          width: 70px;
        }
        .np-lb-wu.you { color: var(--accent); }

        .np-duel-btn {
          padding: 5px 10px;
          background: none;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 2px;
          font-family: 'Share Tech Mono', monospace;
          font-size: 8px; letter-spacing: 0.1em;
          color: rgba(255,255,255,0.3);
          cursor: pointer; transition: all 0.2s;
          flex-shrink: 0;
        }
        .np-duel-btn:hover {
          border-color: rgba(236,72,153,0.4);
          color: rgba(236,72,153,0.7);
        }

        /* ── Invite strip ── */
        .np-invite-strip {
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 4px;
          margin-bottom: 20px;
          gap: 12px;
        }

        .np-invite-label {
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.2em;
          color: rgba(255,255,255,0.2);
          text-transform: uppercase;
        }

        .np-invite-code {
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px; letter-spacing: 0.1em;
          color: rgba(255,255,255,0.35);
          flex: 1; text-align: center;
          overflow: hidden; text-overflow: ellipsis;
        }

        .np-copy-btn {
          padding: 6px 12px;
          background: rgba(0,255,255,0.06);
          border: 1px solid rgba(0,255,255,0.2);
          border-radius: 2px;
          font-family: 'Share Tech Mono', monospace;
          font-size: 8px; letter-spacing: 0.15em;
          color: rgba(0,255,255,0.6);
          cursor: pointer; transition: all 0.2s;
          flex-shrink: 0;
          text-transform: uppercase;
        }
        .np-copy-btn:hover { background: rgba(0,255,255,0.1); }
        .np-copy-btn.copied { color: rgba(52,211,153,0.8); border-color: rgba(52,211,153,0.3); }

        /* ── Duel cards ── */
        .np-duel-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 5px;
          padding: 16px;
          margin-bottom: 10px;
        }
        .np-duel-card.pending { border-color: rgba(251,191,36,0.2); }
        .np-duel-card.active  { border-color: rgba(236,72,153,0.2); }
        .np-duel-card.completed.win  { border-color: rgba(0,255,255,0.2); }
        .np-duel-card.completed.loss { border-color: rgba(255,255,255,0.06); }

        .np-duel-top {
          display: flex; align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .np-duel-vs {
          font-size: 14px; font-weight: 700;
          letter-spacing: 0.03em;
          color: rgba(255,255,255,0.8);
        }

        .np-duel-status {
          font-family: 'Share Tech Mono', monospace;
          font-size: 8px; letter-spacing: 0.2em;
          text-transform: uppercase;
          padding: 3px 8px; border-radius: 2px;
        }
        .np-duel-status.pending   { color: rgba(251,191,36,0.7);  background: rgba(251,191,36,0.06);  border: 1px solid rgba(251,191,36,0.2); }
        .np-duel-status.active    { color: rgba(236,72,153,0.7);  background: rgba(236,72,153,0.06);  border: 1px solid rgba(236,72,153,0.2); }
        .np-duel-status.completed { color: rgba(0,255,255,0.6);   background: rgba(0,255,255,0.05);   border: 1px solid rgba(0,255,255,0.15); }
        .np-duel-status.declined  { color: rgba(255,255,255,0.2); background: transparent; border: 1px solid rgba(255,255,255,0.08); }

        .np-duel-meta {
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.12em;
          color: rgba(255,255,255,0.2);
          text-transform: uppercase;
          margin-bottom: 10px;
          display: flex; gap: 14px; flex-wrap: wrap;
        }

        .np-duel-progress {
          display: flex; gap: 6px; margin-bottom: 12px;
        }

        .np-duel-side {
          flex: 1; padding: 10px;
          background: rgba(255,255,255,0.02);
          border-radius: 3px; text-align: center;
        }
        .np-duel-side.winner { background: rgba(0,255,255,0.05); }

        .np-duel-side-name {
          font-family: 'Share Tech Mono', monospace;
          font-size: 8px; letter-spacing: 0.1em;
          color: rgba(255,255,255,0.25);
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .np-duel-side-wu {
          font-family: 'Rajdhani', sans-serif;
          font-size: 18px; font-weight: 700;
          color: rgba(255,255,255,0.6);
        }
        .np-duel-side-wu.winner { color: #00ffff; }

        .np-duel-bet {
          font-family: 'Share Tech Mono', monospace;
          font-size: 8px; letter-spacing: 0.08em;
          color: rgba(255,255,255,0.18);
          margin-top: 2px;
        }

        .np-accept-row {
          display: flex; gap: 8px; margin-top: 10px;
        }

        .np-btn-accept {
          flex: 1; padding: 9px;
          background: rgba(52,211,153,0.07);
          border: 1px solid rgba(52,211,153,0.25);
          border-radius: 3px;
          color: rgba(52,211,153,0.8);
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          cursor: pointer; transition: all 0.2s;
        }
        .np-btn-accept:hover { background: rgba(52,211,153,0.12); }

        .np-btn-decline {
          padding: 9px 14px;
          background: none;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 3px;
          color: rgba(255,255,255,0.2);
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px; font-weight: 600;
          letter-spacing: 0.1em; text-transform: uppercase;
          cursor: pointer; transition: all 0.2s;
        }
        .np-btn-decline:hover { color: rgba(239,68,68,0.6); border-color: rgba(239,68,68,0.2); }

        /* ── Duel form ── */
        .np-duel-form {
          background: rgba(236,72,153,0.03);
          border: 1px solid rgba(236,72,153,0.15);
          border-radius: 5px;
          padding: 18px;
          margin-bottom: 16px;
        }

        .np-duel-form-title {
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.25em;
          color: rgba(236,72,153,0.5);
          text-transform: uppercase;
          margin-bottom: 14px;
        }

        .np-select {
          width: 100%;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 3px;
          padding: 10px 12px;
          color: rgba(255,255,255,0.75);
          font-family: 'Rajdhani', sans-serif;
          font-size: 14px;
          outline: none; margin-bottom: 12px;
          appearance: none;
        }

        .np-danger-btn {
          padding: 7px 12px;
          background: none;
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 3px;
          color: rgba(239,68,68,0.45);
          font-family: 'Share Tech Mono', monospace;
          font-size: 8px; letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer; transition: all 0.2s;
        }
        .np-danger-btn:hover {
          background: rgba(239,68,68,0.05);
          color: rgba(239,68,68,0.7);
          border-color: rgba(239,68,68,0.35);
        }

        .np-loading {
          display: flex; align-items: center; gap: 10px;
          padding: 24px 0;
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.2em;
          color: rgba(255,255,255,0.18);
          text-transform: uppercase;
        }

        .np-spinner {
          width: 14px; height: 14px;
          border: 1px solid rgba(255,255,255,0.1);
          border-top-color: rgba(0,255,255,0.6);
          border-radius: 50%;
          animation: np-spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes np-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="np-root" style={{ ["--accent" as string]: accentColor }}>

        {/* Topbar */}
        <div className="np-topbar">
          {selected ? (
            <button className="np-back" onClick={() => setSelected(null)}>
              ← NETWORKS
            </button>
          ) : (
            <span className="np-page-title">// Networks</span>
          )}

          {!selected && (
            <button
              className="np-create-btn"
              onClick={() => setShowCreate((p) => !p)}
            >
              {showCreate ? "Cancel" : "+ Create"}
            </button>
          )}
        </div>

        <div className="np-body">

          {/* ── Network list view ── */}
          {!selected && (
            <>
              {/* Create form */}
              {showCreate && (
                <div className="np-form-card">
                  <span className="np-form-label">// Network name</span>
                  <input
                    className="np-input"
                    placeholder="Iron Collective, The Mental Ward..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />

                  <span className="np-form-label">// Domain focus</span>
                  <div className="np-domain-grid">
                    {DOMAINS.map((d) => (
                      <button
                        key={d}
                        className={`np-domain-pill ${newDomain === d ? "selected" : ""}`}
                        style={{ ["--pill-color" as string]: DOMAIN_COLORS[d] }}
                        onClick={() => setNewDomain(d)}
                      >
                        {d}
                      </button>
                    ))}
                  </div>

                  <div className="np-form-actions">
                    <button
                      className="np-btn-primary"
                      onClick={handleCreate}
                      disabled={isPending || !newName.trim()}
                    >
                      {isPending ? "Creating..." : "Create Network"}
                    </button>
                    <button
                      className="np-btn-ghost"
                      onClick={() => setShowCreate(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Networks list */}
              {loading ? (
                <div className="np-loading">
                  <div className="np-spinner" />
                  Loading networks
                </div>
              ) : networks.length === 0 ? (
                <div className="np-empty">
                  No networks yet<br />
                  Create one or join via invite link
                </div>
              ) : (
                <>
                  <div className="np-list-label">
                    // Your networks — {networks.length} / 5
                  </div>
                  {networks.map((n) => (
                    <button
                      key={n.id}
                      className={`np-network-card ${selected && selected["id"] === n.id ? "active" : ""}`}
                      style={{ ["--accent" as string]: DOMAIN_COLORS[n.domain] }}
                      onClick={() => loadNetwork(n)}
                    >
                      <div className="np-card-top">
                        <span className="np-card-name">{n.name}</span>
                        <span
                          className="np-domain-badge"
                          style={{ ["--badge-color" as string]: DOMAIN_COLORS[n.domain] }}
                        >
                          {n.domain}
                        </span>
                      </div>
                      <div className="np-card-meta">
                        <span>
                          {n.isOwner && <span className="np-owner-dot" />}
                          {n.memberCount} member{n.memberCount !== 1 ? "s" : ""}
                        </span>
                        <span>
                          {n.isOwner ? "owner" : "member"}
                        </span>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </>
          )}

          {/* ── Network interior ── */}
          {selected && (
            <>
              <div className="np-interior-header">
                <div className="np-interior-name">{selected.name}</div>
                <div className="np-interior-meta">
                  <span
                    className="np-domain-badge"
                    style={{ ["--badge-color" as string]: accentColor }}
                  >
                    {selected.domain}
                  </span>
                  <span style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: 9, letterSpacing: "0.15em",
                    color: "rgba(255,255,255,0.2)",
                    textTransform: "uppercase",
                  }}>
                    {selected.memberCount} / 20 members
                  </span>
                </div>
              </div>

              {/* Invite strip */}
              <div className="np-invite-strip">
                <span className="np-invite-label">Invite</span>
                <span className="np-invite-code">
                  {window.location.origin}/network/join/{selected.inviteCode}
                </span>
                <button
                  className={`np-copy-btn ${copied === selected.inviteCode ? "copied" : ""}`}
                  onClick={() => handleCopyInvite(selected.inviteCode)}
                >
                  {copied === selected.inviteCode ? "Copied ✓" : "Copy"}
                </button>
              </div>

              {/* Tabs */}
              <div className="np-interior-tabs">
                <button
                  className={`np-tab ${view === "boards" ? "active" : ""}`}
                  onClick={() => setView("boards")}
                >
                  Leaderboard
                </button>
                <button
                  className={`np-tab ${view === "duels" ? "active" : ""}`}
                  onClick={() => setView("duels")}
                >
                  Duels {duels.filter(d => d.status === "Pending" && !d.isInitiator).length > 0 && "●"}
                </button>
              </div>

              {/* ── Leaderboard tab ── */}
              {view === "boards" && (
                <>
                  {isPending ? (
                    <div className="np-loading">
                      <div className="np-spinner" />
                      Loading leaderboard
                    </div>
                  ) : (
                    leaderboard.map((entry) => (
                      <div
                        key={entry.userId}
                        className={`np-lb-row ${entry.isYou ? "you" : ""}`}
                      >
                        <span className={`np-rank ${
                          entry.rank === 1 ? "first" :
                          entry.rank === 2 ? "second" :
                          entry.rank === 3 ? "third" : "other"
                        }`}>
                          {entry.rank === 1 ? "◆" :
                           entry.rank === 2 ? "◈" :
                           entry.rank === 3 ? "◎" :
                           entry.rank}
                        </span>

                        <span className={`np-lb-name ${entry.isYou ? "you" : ""}`}>
                          {entry.userName}
                          {entry.isYou && (
                            <span style={{
                              fontFamily: "'Share Tech Mono', monospace",
                              fontSize: 8, letterSpacing: "0.1em",
                              color: "rgba(255,255,255,0.2)",
                              marginLeft: 8,
                            }}>YOU</span>
                          )}
                        </span>

                        {entry.masteryTier && (
                          <span
                            className="np-tier-badge"
                            style={{ ["--tier-color" as string]: TIER_COLORS[entry.masteryTier] }}
                          >
                            {entry.masteryTier}
                          </span>
                        )}

                        <span className={`np-lb-wu ${entry.isYou ? "you" : ""}`}>
                          {entry.domainWU} WU
                        </span>

                        {!entry.isYou && (
                          <button
                            className="np-duel-btn"
                            onClick={() => {
                              setDuelTarget(entry.userId);
                              setDuelDomain(selected.domain);
                              setShowDuelForm(true);
                            }}
                          >
                            DUEL
                          </button>
                        )}
                      </div>
                    ))
                  )}

                  {/* Network actions */}
                  <div style={{
                    marginTop: 28, paddingTop: 16,
                    borderTop: "1px solid rgba(255,255,255,0.04)",
                    display: "flex", gap: 8,
                  }}>
                    {selected.isOwner ? (
                      <button
                        className="np-danger-btn"
                        onClick={() => handleDelete(selected.id)}
                      >
                        Delete Network
                      </button>
                    ) : (
                      <button
                        className="np-danger-btn"
                        onClick={() => handleLeave(selected.id)}
                      >
                        Leave Network
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* ── Duels tab ── */}
              {view === "duels" && (
                <>
                  {/* Duel challenge form */}
                  {showDuelForm && (
                    <div className="np-duel-form">
                      <div className="np-duel-form-title">// Issue Challenge</div>

                      <span className="np-form-label">// Opponent</span>
                      <select
                        className="np-select"
                        value={duelTarget}
                        onChange={(e) => setDuelTarget(e.target.value)}
                      >
                        <option value="">Select opponent</option>
                        {leaderboard
                          .filter((e) => !e.isYou)
                          .map((e) => (
                            <option key={e.userId} value={e.userId}>
                              {e.userName}
                            </option>
                          ))}
                      </select>

                      <span className="np-form-label">// Domain</span>
                      <div className="np-domain-grid" style={{ marginBottom: 12 }}>
                        {DOMAINS.map((d) => (
                          <button
                            key={d}
                            className={`np-domain-pill ${duelDomain === d ? "selected" : ""}`}
                            style={{ ["--pill-color" as string]: DOMAIN_COLORS[d] }}
                            onClick={() => setDuelDomain(d)}
                          >
                            {d}
                          </button>
                        ))}
                      </div>

                      <span className="np-form-label">// Your bet (WU)</span>
                      <input
                        className="np-input"
                        type="number"
                        placeholder="50"
                        min="1"
                        value={duelBet}
                        onChange={(e) => setDuelBet(e.target.value)}
                      />

                      <div className="np-form-actions">
                        <button
                          className="np-btn-primary"
                          style={{
                            background: "rgba(236,72,153,0.07)",
                            borderColor: "rgba(236,72,153,0.28)",
                            color: "rgba(236,72,153,0.8)",
                          }}
                          onClick={handleInitiateDuel}
                          disabled={isPending || !duelTarget || !duelBet}
                        >
                          {isPending ? "Sending..." : "Issue Challenge"}
                        </button>
                        <button
                          className="np-btn-ghost"
                          onClick={() => setShowDuelForm(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {!showDuelForm && (
                    <button
                      className="np-btn-primary"
                      style={{ marginBottom: 16, width: "auto", padding: "9px 18px",
                        background: "rgba(236,72,153,0.07)",
                        borderColor: "rgba(236,72,153,0.22)",
                        color: "rgba(236,72,153,0.7)",
                      }}
                      onClick={() => setShowDuelForm(true)}
                    >
                      + Issue Challenge
                    </button>
                  )}

                  {/* Duel list */}
                  {duels.length === 0 ? (
                    <div className="np-empty" style={{ padding: "32px 0" }}>
                      No duels yet
                    </div>
                  ) : (
                    duels.map((duel) => {
                      const isWinner = duel.winnerId === (duel.isInitiator ? duel.initiatorName : duel.challengerName);

                      const myWU = duel.isInitiator ? duel.initiatorWU : duel.challengerWU;
                      const theirWU = duel.isInitiator ? duel.challengerWU : duel.initiatorWU;
                      const myName = duel.isInitiator ? duel.initiatorName : duel.challengerName;
                      const theirName = duel.isInitiator ? duel.challengerName : duel.initiatorName;
                      const iWin = duel.status === "Completed" && (
                        (duel.isInitiator && duel.winnerId === duel.initiatorName) ||
                        (!duel.isInitiator && duel.winnerId === duel.challengerName)
                      );

                      return (
                        <div
                          key={duel.id}
                          className={`np-duel-card ${duel.status.toLowerCase()} ${
                            duel.status === "Completed" ? (iWin ? "win" : "loss") : ""
                          }`}
                        >
                          <div className="np-duel-top">
                            <span className="np-duel-vs">
                              {myName} vs {theirName}
                            </span>
                            <span className={`np-duel-status ${duel.status.toLowerCase()}`}>
                              {duel.status}
                            </span>
                          </div>

                          <div className="np-duel-meta">
                            <span
                              style={{ color: DOMAIN_COLORS[duel.domain] ?? "rgba(255,255,255,0.3)" }}
                            >
                              {duel.domain}
                            </span>
                            {duel.endsAt && duel.status === "Active" && (
                              <span>
                                Ends {new Date(duel.endsAt).toLocaleDateString("en-US", {
                                  month: "short", day: "numeric",
                                })}
                              </span>
                            )}
                          </div>

                          {/* WU progress */}
                          {(duel.status === "Active" || duel.status === "Completed") && (
                            <div className="np-duel-progress">
                              <div className={`np-duel-side ${iWin ? "winner" : ""}`}>
                                <div className="np-duel-side-name">You</div>
                                <div className={`np-duel-side-wu ${iWin ? "winner" : ""}`}>
                                  {myWU.toFixed(0)}
                                </div>
                                <div className="np-duel-bet">
                                  bet: {duel.isInitiator ? duel.initiatorBet : duel.challengerBet} WU
                                </div>
                              </div>
                              <div style={{
                                display: "flex", alignItems: "center",
                                padding: "0 6px",
                                fontFamily: "'Share Tech Mono', monospace",
                                fontSize: 10, color: "rgba(255,255,255,0.2)",
                              }}>
                                VS
                              </div>
                              <div className={`np-duel-side ${!iWin && duel.status === "Completed" ? "winner" : ""}`}>
                                <div className="np-duel-side-name">{theirName}</div>
                                <div className={`np-duel-side-wu ${!iWin && duel.status === "Completed" ? "winner" : ""}`}>
                                  {theirWU.toFixed(0)}
                                </div>
                                <div className="np-duel-bet">
                                  bet: {duel.isInitiator ? duel.challengerBet : duel.initiatorBet} WU
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Accept/decline for pending duels you received */}
                          {duel.status === "Pending" && !duel.isInitiator && (
                            <>
                              <div className="np-duel-meta" style={{ marginBottom: 8 }}>
                                <span>Their bet: {duel.initiatorBet} WU</span>
                              </div>

                              {acceptingId === duel.id ? (
                                <>
                                  <input
                                    className="np-input"
                                    type="number"
                                    placeholder="Your bet amount (WU)"
                                    min="1"
                                    value={acceptBet}
                                    onChange={(e) => setAcceptBet(e.target.value)}
                                    style={{ marginBottom: 8 }}
                                  />
                                  <div className="np-accept-row">
                                    <button
                                      className="np-btn-accept"
                                      onClick={() => handleAcceptDuel(duel.id)}
                                      disabled={isPending || !acceptBet}
                                    >
                                      {isPending ? "Accepting..." : "Confirm Bet"}
                                    </button>
                                    <button
                                      className="np-btn-decline"
                                      onClick={() => setAcceptingId(null)}
                                    >
                                      Back
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <div className="np-accept-row">
                                  <button
                                    className="np-btn-accept"
                                    onClick={() => setAcceptingId(duel.id)}
                                  >
                                    Accept
                                  </button>
                                  <button
                                    className="np-btn-decline"
                                    onClick={() => handleDeclineDuel(duel.id)}
                                  >
                                    Decline
                                  </button>
                                </div>
                              )}
                            </>
                          )}

                          {/* Pending — waiting for response */}
                          {duel.status === "Pending" && duel.isInitiator && (
                            <div style={{
                              fontFamily: "'Share Tech Mono', monospace",
                              fontSize: 9, letterSpacing: "0.15em",
                              color: "rgba(255,255,255,0.18)",
                              textTransform: "uppercase",
                              marginTop: 8,
                            }}>
                              Awaiting response...
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}