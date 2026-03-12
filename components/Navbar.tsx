"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

// ─── Ninja Shadow SVG Icon ────────────────────────────────────────────────────
function NinjaShadowIcon({ lit }: { lit?: boolean }) {
  return (
    <svg
      width="22" height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        filter: lit
          ? "drop-shadow(0 0 5px rgba(0,255,255,0.9)) drop-shadow(0 0 10px rgba(0,255,255,0.5))"
          : "none",
        transition: "filter 0.4s",
      }}
    >
      {/* Head */}
      <circle cx="12" cy="7" r="4.5"
        fill="rgba(255,255,255,0.06)"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.75"
      />
      {/* Mask — covers lower face */}
      <path
        d="M8 8.5 Q12 11 16 8.5 L16 11.5 Q12 13.5 8 11.5 Z"
        fill="rgba(255,255,255,0.12)"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="0.5"
      />
      {/* Eyes */}
      <ellipse cx="10.2" cy="7.2" rx="1.3" ry="0.9"
        fill={lit ? "rgba(0,255,255,0.95)" : "rgba(255,255,255,0.2)"}
        style={{ transition: "fill 0.35s" }}
      />
      <ellipse cx="13.8" cy="7.2" rx="1.3" ry="0.9"
        fill={lit ? "rgba(0,255,255,0.95)" : "rgba(255,255,255,0.2)"}
        style={{ transition: "fill 0.35s" }}
      />
      {/* Headband */}
      <path
        d="M7.5 5.5 Q12 4 16.5 5.5"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      {/* Headband knot — right side */}
      <path
        d="M16.5 5.5 L18.5 4.5 M16.5 5.5 L18 6.5"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      {/* Body / cloak */}
      <path
        d="M8 13 Q6 14 5.5 17 L5 21 Q8.5 22 12 22 Q15.5 22 19 21 L18.5 17 Q18 14 16 13 Q14.5 12.5 12 12.5 Q9.5 12.5 8 13Z"
        fill="rgba(255,255,255,0.05)"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="0.75"
      />
      {/* Cloak fold lines */}
      <path
        d="M10 13.5 L9 21"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="0.5"
      />
      <path
        d="M14 13.5 L15 21"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="0.5"
      />
      {/* Arms crossed */}
      <path
        d="M7 15.5 Q9.5 14.5 12 15 Q14.5 14.5 17 15.5"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Nav items ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="1"
          fill={active ? "rgba(0,255,255,0.7)" : "rgba(255,255,255,0.25)"}
          stroke={active ? "rgba(0,255,255,0.5)" : "rgba(255,255,255,0.15)"}
          strokeWidth="0.75"
        />
        <rect x="14" y="3" width="7" height="7" rx="1"
          fill={active ? "rgba(0,255,255,0.5)" : "rgba(255,255,255,0.12)"}
          stroke={active ? "rgba(0,255,255,0.4)" : "rgba(255,255,255,0.1)"}
          strokeWidth="0.75"
        />
        <rect x="3" y="14" width="7" height="7" rx="1"
          fill={active ? "rgba(0,255,255,0.5)" : "rgba(255,255,255,0.12)"}
          stroke={active ? "rgba(0,255,255,0.4)" : "rgba(255,255,255,0.1)"}
          strokeWidth="0.75"
        />
        <rect x="14" y="14" width="7" height="7" rx="1"
          fill={active ? "rgba(0,255,255,0.7)" : "rgba(255,255,255,0.25)"}
          stroke={active ? "rgba(0,255,255,0.5)" : "rgba(255,255,255,0.15)"}
          strokeWidth="0.75"
        />
      </svg>
    ),
  },
  {
    path: "/domain",
    label: "Domains",
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9"
          stroke={active ? "rgba(0,255,255,0.6)" : "rgba(255,255,255,0.2)"}
          strokeWidth="0.75" fill="none"
        />
        <path d="M12 3 Q16 12 12 21"
          stroke={active ? "rgba(0,255,255,0.5)" : "rgba(255,255,255,0.15)"}
          strokeWidth="0.75" fill="none"
        />
        <path d="M12 3 Q8 12 12 21"
          stroke={active ? "rgba(0,255,255,0.5)" : "rgba(255,255,255,0.15)"}
          strokeWidth="0.75" fill="none"
        />
        <path d="M3 12 Q12 8 21 12"
          stroke={active ? "rgba(0,255,255,0.5)" : "rgba(255,255,255,0.15)"}
          strokeWidth="0.75" fill="none"
        />
        <circle cx="12" cy="12" r="1.5"
          fill={active ? "rgba(0,255,255,0.8)" : "rgba(255,255,255,0.3)"}
        />
      </svg>
    ),
  },
  {
    path: "/mission",
    label: "Mission",
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 2 L14.5 9 L22 9 L16 13.5 L18.5 21 L12 16.5 L5.5 21 L8 13.5 L2 9 L9.5 9 Z"
          fill={active ? "rgba(0,255,255,0.15)" : "none"}
          stroke={active ? "rgba(0,255,255,0.7)" : "rgba(255,255,255,0.25)"}
          strokeWidth="0.75"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    path: "/achievements",
    label: "Achieve",
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M8 3 L16 3 L19 8 L12 20 L5 8 Z"
          fill={active ? "rgba(0,255,255,0.1)" : "none"}
          stroke={active ? "rgba(0,255,255,0.65)" : "rgba(255,255,255,0.2)"}
          strokeWidth="0.75"
          strokeLinejoin="round"
        />
        <path d="M5 8 L19 8"
          stroke={active ? "rgba(0,255,255,0.4)" : "rgba(255,255,255,0.12)"}
          strokeWidth="0.75"
        />
        <path d="M9.5 8 L12 20 M14.5 8 L12 20"
          stroke={active ? "rgba(0,255,255,0.3)" : "rgba(255,255,255,0.08)"}
          strokeWidth="0.5"
        />
      </svg>
    ),
  },
  {
    path: "/network",
    label: "Network",
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="5" r="2.5"
          fill={active ? "rgba(0,255,255,0.2)" : "rgba(255,255,255,0.06)"}
          stroke={active ? "rgba(0,255,255,0.7)" : "rgba(255,255,255,0.2)"}
          strokeWidth="0.75"
        />
        <circle cx="4" cy="18" r="2.5"
          fill={active ? "rgba(0,255,255,0.2)" : "rgba(255,255,255,0.06)"}
          stroke={active ? "rgba(0,255,255,0.7)" : "rgba(255,255,255,0.2)"}
          strokeWidth="0.75"
        />
        <circle cx="20" cy="18" r="2.5"
          fill={active ? "rgba(0,255,255,0.2)" : "rgba(255,255,255,0.06)"}
          stroke={active ? "rgba(0,255,255,0.7)" : "rgba(255,255,255,0.2)"}
          strokeWidth="0.75"
        />
        <path
          d="M12 7.5 L4 15.5 M12 7.5 L20 15.5 M4 18 L20 18"
          stroke={active ? "rgba(0,255,255,0.35)" : "rgba(255,255,255,0.1)"}
          strokeWidth="0.75"
        />
      </svg>
    ),
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export function Navbar() {
  const pathname              = usePathname();
  const router                = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const currentPath = "/" + (pathname?.split("/")[1] ?? "");

  async function handleSignOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.push("/");
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Share+Tech+Mono&display=swap');

        .nb-rail {
          position: fixed;
          left: 0; top: 0; bottom: 0;
          z-index: 100;
          display: flex; flex-direction: column;
          background: rgba(5,5,8,0.97);
          border-right: 1px solid rgba(255,255,255,0.05);
          backdrop-filter: blur(12px);
          transition: width 0.25s cubic-bezier(0.4,0,0.2,1);
          width: ${expanded ? "160px" : "52px"};
          overflow: hidden;
        }

        /* Top — logo area */
        .nb-logo {
          display: flex; align-items: center;
          padding: 16px 14px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          cursor: pointer;
          flex-shrink: 0;
          gap: 10px;
          min-height: 52px;
        }

        .nb-logo-mark {
          width: 24px; height: 24px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }

        .nb-logo-diamond {
          width: 10px; height: 10px;
          background: rgba(0,255,255,0.7);
          transform: rotate(45deg);
          box-shadow: 0 0 8px rgba(0,255,255,0.5);
          flex-shrink: 0;
        }

        .nb-logo-text {
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px; letter-spacing: 0.25em;
          color: rgba(0,255,255,0.55);
          text-transform: uppercase;
          white-space: nowrap;
          opacity: ${expanded ? 1 : 0};
          transition: opacity 0.15s;
        }

        /* Nav items */
        .nb-nav {
          flex: 1;
          display: flex; flex-direction: column;
          padding: 8px 0;
          gap: 2px;
          overflow: hidden;
        }

        .nb-item {
          display: flex; align-items: center;
          gap: 12px;
          padding: 11px 14px;
          cursor: pointer;
          border: none; background: none;
          width: 100%; text-align: left;
          border-radius: 0;
          position: relative;
          transition: background 0.15s;
          text-decoration: none;
          flex-shrink: 0;
          min-height: 44px;
        }

        .nb-item:hover {
          background: rgba(255,255,255,0.03);
        }

        .nb-item.active {
          background: rgba(0,255,255,0.05);
        }

        /* Active indicator bar */
        .nb-item.active::before {
          content: '';
          position: absolute;
          left: 0; top: 20%; bottom: 20%;
          width: 2px;
          background: rgba(0,255,255,0.7);
          box-shadow: 0 0 6px rgba(0,255,255,0.5);
          border-radius: 0 2px 2px 0;
        }

        .nb-icon { flex-shrink: 0; width: 20px; height: 20px; }

        .nb-label {
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase;
          white-space: nowrap;
          opacity: ${expanded ? 1 : 0};
          transition: opacity 0.15s;
        }

        .nb-label.active { color: rgba(0,255,255,0.8); }
        .nb-label.inactive { color: rgba(255,255,255,0.35); }

        /* Shadow ninja nav item */
        .nb-shadow-item {
          display: flex; align-items: center;
          gap: 12px;
          padding: 11px 14px;
          cursor: pointer;
          border: none; background: none;
          width: 100%; text-align: left;
          min-height: 44px; flex-shrink: 0;
          transition: background 0.15s;
        }
        .nb-shadow-item:hover { background: rgba(255,255,255,0.02); }

        .nb-shadow-label {
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px; letter-spacing: 0.18em;
          text-transform: uppercase;
          white-space: nowrap;
          color: rgba(255,255,255,0.15);
          opacity: ${expanded ? 1 : 0};
          transition: opacity 0.15s;
        }

        /* Bottom — sign out */
        .nb-bottom {
          padding: 8px 0 16px;
          border-top: 1px solid rgba(255,255,255,0.04);
          flex-shrink: 0;
        }

        .nb-signout {
          display: flex; align-items: center;
          gap: 12px;
          padding: 10px 14px;
          cursor: pointer;
          border: none; background: none;
          width: 100%;
          transition: background 0.15s;
          min-height: 44px;
        }
        .nb-signout:hover { background: rgba(239,68,68,0.04); }

        .nb-signout-icon {
          width: 20px; height: 20px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }

        .nb-signout-label {
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px; font-weight: 600;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: rgba(239,68,68,0.4);
          white-space: nowrap;
          opacity: ${expanded ? 1 : 0};
          transition: opacity 0.15s;
        }

        /* Toggle button */
        .nb-toggle {
          position: absolute;
          right: -10px; top: 50%;
          transform: translateY(-50%);
          width: 20px; height: 20px;
          background: #07070c;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 50%;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 8px; color: rgba(255,255,255,0.25);
          z-index: 101;
          transition: color 0.2s, border-color 0.2s;
        }
        .nb-toggle:hover {
          color: rgba(255,255,255,0.6);
          border-color: rgba(255,255,255,0.2);
        }

        /* Page offset — push content right */
        .nb-offset {
          transition: margin-left 0.25s cubic-bezier(0.4,0,0.2,1);
        }
      `}</style>

      <nav className="nb-rail">

        {/* Toggle */}
        <button className="nb-toggle" onClick={() => setExpanded((p) => !p)}>
          {expanded ? "‹" : "›"}
        </button>

        {/* Logo */}
        <div className="nb-logo" onClick={() => router.push("/dashboard")}>
          <div className="nb-logo-mark">
            <div className="nb-logo-diamond" />
          </div>
          <span className="nb-logo-text">LifeTrack</span>
        </div>

        {/* Nav items */}
        <div className="nb-nav">
          {NAV_ITEMS.map((item) => {
            const active = currentPath === item.path ||
              (item.path !== "/" && pathname?.startsWith(item.path));

            return (
              <button
                key={item.path}
                className={`nb-item ${active ? "active" : ""}`}
                onClick={() => router.push(item.path)}
                title={!expanded ? item.label : undefined}
              >
                <span className="nb-icon">{item.icon(!!active)}</span>
                <span className={`nb-label ${active ? "active" : "inactive"}`}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Shadow ninja item — links to mission page */}
          <button
            className="nb-shadow-item"
            onClick={() => router.push("/mission")}
            title={!expanded ? "Shadow" : undefined}
          >
            <span className="nb-icon">
              <NinjaShadowIcon lit={currentPath === "/mission"} />
            </span>
            <span className="nb-shadow-label">// Shadow</span>
          </button>
        </div>

        {/* Sign out */}
        <div className="nb-bottom">
          <button
            className="nb-signout"
            onClick={handleSignOut}
            disabled={signingOut}
            title={!expanded ? "Sign Out" : undefined}
          >
            <span className="nb-signout-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                  stroke="rgba(239,68,68,0.4)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <polyline
                  points="16 17 21 12 16 7"
                  stroke="rgba(239,68,68,0.4)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <line
                  x1="21" y1="12" x2="9" y2="12"
                  stroke="rgba(239,68,68,0.4)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="nb-signout-label">
              {signingOut ? "Signing out..." : "Sign Out"}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}