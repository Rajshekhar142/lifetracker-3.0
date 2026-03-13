"use client"
import { useState, useEffect } from "react"
import Link from "next/link";
import "@/styles/darktypo.css";
const DOMAINS = [
  { name: "Physical",   sub: "Body & Energy" },
  { name: "Mental",     sub: "Intellect & Clarity" },
  { name: "Emotional",  sub: "Inner World" },
  { name: "Spiritual",  sub: "Meaning & Purpose" },
  { name: "Social",     sub: "Connections" },
  { name: "Financial",  sub: "Resources & Wealth" },
  { name: "Vocational", sub: "Craft & Output" },
];

export default function LandingPage(){
const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>

      <div className="root">
        <div className="bg-glow" />

        <div className="page">

          {/* Nav */}
          <nav className={`nav ${mounted ? "in" : ""}`}>
            <span className="nav-logo">LIFETRACK</span>
            <div className="nav-links">
              <Link href="/sign-in" className="nav-link">Sign In</Link>
              <Link href="/sign-up" className="nav-link-cta">Get Started</Link>
            </div>
          </nav>

          {/* Hero */}
          <section className="hero">
            <div className={`hero-tag ${mounted ? "in" : ""}`}>
              // Personal Architecture System
            </div>

            <h1 className={`hero-title ${mounted ? "in" : ""}`}>
              Build the life<br />
              <em>you keep delaying.</em>
            </h1>

            <p className={`hero-sub ${mounted ? "in" : ""}`}>
              A structured system for tracking effort, measuring growth,
              and compounding progress across every dimension of your life.
            </p>

            <div className={`hero-divider ${mounted ? "in" : ""}`} />

            <div className={`cta-row ${mounted ? "in" : ""}`}>
              <Link href="/sign-up" className="btn-primary">
                Start Building →
              </Link>
              <Link href="/sign-in" className="btn-ghost">
                Sign In
              </Link>
            </div>
          </section>

          {/* Philosophy */}
          <section
            className={`section ${mounted ? "in" : ""}`}
            style={{ transitionDelay: "0.2s" }}
          >
            <div className="section-label">// Philosophy</div>
            <p className="philosophy-text">
              Most people work hard in <strong>one area</strong> while the rest quietly collapse.
              LifeTrack operates on a different premise — that a life is a{" "}
              <strong>complete system</strong>, and every domain compounds every other.
              Neglect one, and the whole structure weakens.
            </p>
          </section>

          {/* 7 Domains */}
          <section
            className={`domains-section ${mounted ? "in" : ""}`}
            style={{ transitionDelay: "0.35s" }}
          >
            <div className="section-label">// The 7 Domains</div>

            <div className="domains-grid">
              {DOMAINS.map((d, i) => (
                <div key={d.name} className="domain-cell">
                  <div className="domain-cell-num">0{i + 1}</div>
                  <div className="domain-cell-name">{d.name}</div>
                  <div className="domain-cell-sub">{d.sub}</div>
                </div>
              ))}
              {/* 8th cell — ghost slot */}
              <div className="domain-cell" style={{ background: "transparent" }}>
                <div className="domain-cell-num" style={{ color: "rgba(0,255,255,0.12)" }}>+</div>
                <div className="domain-cell-name" style={{ color: "rgba(237,232,226,0.2)", fontStyle: "italic", fontWeight: 300 }}>Your own</div>
                <div className="domain-cell-sub">Customize freely</div>
              </div>
            </div>
          </section>

          {/* Coming soon strip */}
          <div
            className={`coming-soon ${mounted ? "in" : ""}`}
            style={{ transitionDelay: "0.5s" }}
          >
            <div className="cs-dot" />
            <div className="cs-text">
              <span>Early Access</span> — Achievements, Battle Ground, and social features
              are in active development. The core system is live and ready.
            </div>
          </div>

          {/* Footer */}
          <footer
            className={`footer ${mounted ? "in" : ""}`}
            style={{ transitionDelay: "0.6s" }}
          >
            <span className="footer-text">LIFETRACK © 2025</span>
            <div className="footer-links">
              <Link href="/sign-up" className="footer-link">Get Started</Link>
              <Link href="/sign-in" className="footer-link">Sign In</Link>
            </div>
          </footer>

        </div>
      </div>
    </>
  );
}
