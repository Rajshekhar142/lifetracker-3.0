"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { signInWithGoogle } from "@/lib/auth-client";
import { checkUserHasDomains } from "../../actions/domain-actions";


export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const res = await signIn.email({
  email: formData.get("email") as string,
  password: formData.get("password") as string,
});

if (res.error) {
  setError(res.error.message || "Access denied.");
} else {
  // Check if they have domains set up — if yes, they're a returning user
  const hasDomains = await checkUserHasDomains();
  router.push(hasDomains ? "/mission" : "/dashboard");
}
  }

  return (
    <div className="cp-root">
      <div className={`cp-layout ${mounted ? "mounted" : ""}`}>
        
        <div className="cp-hero">
          <div className="cp-eyebrow">ACCESS PORTAL</div>
          <h1 className="cp-title">
            Enter <span className="ghost">System</span>
          </h1>
          <p className="cp-copy">
            Authenticate to continue into your <em>dashboard domain</em>.
          </p>
        </div>

        {error && (
          <div className="cp-statusbar" style={{ borderTop: "none", marginTop: 0 }}>
            <div
              className="cp-status-dot"
              style={{ background: "rgba(236,72,153,0.8)" }}
            />
            <div className="cp-status-text" style={{ color: "rgba(236,72,153,0.7)" }}>
              {error}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="cp-cta-wrap">
          <input
            name="email"
            type="email"
            placeholder="EMAIL"
            required
            className="add-input"
          />

          <input
            name="password"
            type="password"
            placeholder="PASSWORD"
            required
            className="add-input"
          />

          <button type="submit" className="cp-btn-confirm">
            <span>Authenticate</span>
            <span className="cp-btn-arrow">→</span>
          </button>
        </form>

        <button
  type="button"
  onClick={signInWithGoogle}
  className="cp-btn-confirm"
  style={{
    marginTop: "8px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "white"
  }}
>
  <span>Sign in with Google</span>
  <span className="cp-btn-arrow">→</span>
</button>

        <div className="cp-statusbar">
          <div
            className="cp-status-dot"
            style={{
              background: "rgba(0,255,255,0.6)",
              boxShadow: "0 0 8px rgba(0,255,255,0.6)",
            }}
          />
          <div className="cp-status-text">
            SYSTEM READY • SECURE CHANNEL
          </div>
        </div>
      </div>
    </div>
  );
}