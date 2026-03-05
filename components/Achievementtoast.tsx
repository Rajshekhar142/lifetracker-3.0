"use client";

import { useEffect, useState } from "react";
import { getAchievementMeta } from "@/lib/Achievements";

type AchievementToastProps = {
  newKeys: string[];       // pass newly unlocked keys from checkAchievementsOnComplete()
  onDismiss: () => void;   // clear the keys from parent state after toast fades
};

export function AchievementToast({ newKeys, onDismiss }: AchievementToastProps) {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!newKeys.length) return;

    setIndex(0);
    setVisible(true);

    const hideTimer = setTimeout(() => {
      setVisible(false);
    }, 3800);

    const dismissTimer = setTimeout(() => {
      onDismiss();
    }, 4200);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(dismissTimer);
    };
  }, [newKeys]);

  // If multiple achievements unlocked at once — cycle through them
  useEffect(() => {
    if (newKeys.length <= 1) return;

    const cycleTimer = setTimeout(() => {
      setIndex((prev) => (prev + 1) % newKeys.length);
    }, 2000);

    return () => clearTimeout(cycleTimer);
  }, [index, newKeys]);

  if (!newKeys.length) return null;

  const key = newKeys[index];
  const meta = getAchievementMeta(key);
  if (!meta) return null;

  return (
    <>
      <style>{`
        .ach-toast-wrap {
          position: fixed;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 500;
          width: calc(100% - 48px);
          max-width: 380px;
          pointer-events: none;
        }

        .ach-toast {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          background: rgba(5,5,8,0.98);
          border: 1px solid rgba(0,255,255,0.25);
          border-radius: 4px;
          box-shadow:
            0 0 0 1px rgba(0,255,255,0.05),
            0 0 24px rgba(0,255,255,0.08),
            0 12px 40px rgba(0,0,0,0.7);
          backdrop-filter: blur(16px);
          position: relative;
          overflow: hidden;
          transition: opacity 0.35s ease, transform 0.35s ease;
        }

        .ach-toast.visible {
          opacity: 1;
          transform: translateY(0px);
        }

        .ach-toast.hidden {
          opacity: 0;
          transform: translateY(10px);
        }

        .ach-drain {
          position: absolute;
          bottom: 0; left: 0;
          height: 1px;
          background: rgba(0,255,255,0.45);
          box-shadow: 0 0 4px rgba(0,255,255,0.4);
          animation: drain 3.8s linear forwards;
        }

        @keyframes drain {
          from { width: 100%; }
          to   { width: 0%; }
        }

        .ach-ambient {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 40px;
          background: linear-gradient(to bottom, rgba(0,255,255,0.04), transparent);
          pointer-events: none;
        }

        .ach-icon {
          font-size: 22px;
          flex-shrink: 0;
          line-height: 1;
          color: #00ffff;
          text-shadow: 0 0 14px rgba(0,255,255,0.9);
          position: relative; z-index: 1;
        }

        .ach-content {
          flex: 1;
          min-width: 0;
          position: relative; z-index: 1;
        }

        .ach-eyebrow {
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px;
          color: rgba(0,255,255,0.5);
          letter-spacing: 0.3em;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .ach-name {
          font-family: 'Rajdhani', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: #fff;
          letter-spacing: 0.05em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ach-desc {
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px;
          font-weight: 400;
          color: rgba(255,255,255,0.4);
          letter-spacing: 0.02em;
          margin-top: 2px;
          line-height: 1.4;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ach-counter {
          font-family: 'Share Tech Mono', monospace;
          font-size: 9px;
          color: rgba(0,255,255,0.35);
          letter-spacing: 0.1em;
          flex-shrink: 0;
          position: relative; z-index: 1;
        }
      `}</style>

      <div className="ach-toast-wrap">
        <div className={`ach-toast ${visible ? "visible" : "hidden"}`}>
          <div className="ach-ambient" />

          <span className="ach-icon">{meta.icon}</span>

          <div className="ach-content">
            <div className="ach-eyebrow">
              {meta.hidden ? "// Hidden Achievement Unlocked" : "// Achievement Unlocked"}
            </div>
            <div className="ach-name">{meta.name}</div>
            <div className="ach-desc">{meta.description}</div>
          </div>

          {newKeys.length > 1 && (
            <div className="ach-counter">{index + 1}/{newKeys.length}</div>
          )}

          <div className="ach-drain" />
        </div>
      </div>
    </>
  );
}