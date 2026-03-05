"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth-client";
import { signInWithGoogle } from "@/lib/auth-client";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    const res = await signUp.email({
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    });

    if (res.error) {
      setError(res.error.message || "Registration failed.");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="cp-root">
      <div className={`cp-layout ${mounted ? "mounted" : ""}`}>

        <div className="cp-hero">
          <div className="cp-eyebrow">INITIALIZE ACCOUNT</div>
          <h1 className="cp-title">
            Create <span className="ghost">Identity</span>
          </h1>
          <p className="cp-copy">
            Provision a new access profile inside your <em>control system</em>.
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
            name="name"
            placeholder="FULL NAME"
            required
            className="add-input"
          />

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
            placeholder="PASSWORD (MIN 8)"
            required
            minLength={8}
            className="add-input"
          />

          <button type="submit" className="cp-btn-confirm">
            <span>Initialize</span>
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
            IDENTITY PROVISIONING MODULE
          </div>
        </div>

      </div>
    </div>
  );
}