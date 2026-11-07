import Link from "next/link";
import { Play, Scale, ShieldAlert, Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";
import "./globals.css";

export default function LandingPage() {
  return (
    <main className="landing-viewport">
      <div className="ambient-glow-top" />
      <div className="ambient-glow-bottom" />

      <div className="landing-container">
        {/* ================= LEFT COLUMN: HERO PITCH ================= */}
        <section className="hero-content">

          <h1 className="hero-title">
            Kulprit<span>.</span>
          </h1>

          <p className="hero-tagline">
            Spot the lie. Shield the innocent. Corner the culprit.
          </p>

          <p className="hero-description">
            An investigation hearing where flawed logic and fabricated timelines
            will frame the innocent, unless you call objection in time.
          </p>

          <Link href="/play" className="hero-split-btn">
            <span className="hero-split-main">Play Now</span>
            <span className="hero-split-icon">
              <Play size={14} fill="currentColor" />
            </span>
          </Link>
        </section>

        {/* ================= RIGHT COLUMN: SPREAD CARD DECK ================= */}
        <section className="deck-stage">
          <div className="deck-container">
            {/* CARD 1 (Exposed Left Wing): Liam - Accuser */}
            <div className="deck-card card-accuser">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="card-header-badge">Accuser</span>
                <AlertTriangle size={14} color="#fb7185" />
              </div>

              {/* Avatar placed on the outer left exposed flank */}
              <div className="exposed-avatar-left">
                <img
                  src="/avatars/1.png"
                  alt="Liam"
                  className="card-char-avatar avatar-border-rose"
                />
                <div>
                  <div className="card-char-name">Liam R.</div>
                  <div className="card-char-subtext">Biased Claim</div>
                </div>
              </div>

              <div className="card-dialogue-snippet">
                "He was distracted all morning, so he broke it."
              </div>
            </div>

            {/* CARD 2 (Exposed Right Wing): Sofia - Culprit */}
            <div className="deck-card card-culprit">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <AlertTriangle size={14} color="#f59e0b" />
                <span className="card-header-badge">Suspect</span>
              </div>

              {/* Avatar placed on the outer right exposed flank */}
              <div className="exposed-avatar-right">
                <div>
                  <div className="card-char-name">Sofia V.</div>
                  <div className="card-char-subtext">Fake Alibi</div>
                </div>
                <img
                  src="/avatars/2.png"
                  alt="Sofia"
                  className="card-char-avatar avatar-border-amber"
                />
              </div>

              <div className="card-dialogue-snippet">
                "I logged out well before the incident happened."
              </div>
            </div>

            {/* CARD 3 (Elevated Top Peek): Jordan - Key Witness */}
            <div className="deck-card card-witness">
              {/* Avatar placed at the top so it peeks above the front card */}
              <div className="exposed-avatar-top">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <img
                    src="/avatars/3.png"
                    alt="Jordan"
                    className="card-char-avatar avatar-border-emerald"
                  />
                  <div>
                    <div className="card-char-name">Jordan T.</div>
                    <div className="card-char-subtext">Key Witness</div>
                  </div>
                </div>
                <span className="card-header-badge">
                  <CheckCircle2 size={12} color="#34d399" />
                  Verified
                </span>
              </div>

              <div className="card-dialogue-snippet" style={{ marginTop: "auto" }}>
                "Badge scans confirm badge #042 on-site at 14:28."
              </div>
            </div>


            <div className="deck-card card-magistrate">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="card-header-badge">Presiding Magistrate</span>
                <span style={{ fontSize: "11px", color: "var(--lp-text-muted)", fontFamily: "var(--font-mono, monospace)" }}>
                  IN SESSION
                </span>
              </div>

              {/* TOP CARD: Magistrate Shaaf */}
              <div className="magistrate-centerpiece">
                <div className="landing-judge-avatar-frame">
                  <img src="/avatars/judge.png" alt="Magistrate" />
                </div>
                <div className="magistrate-title">Magistrate Shaaf</div>
                <div className="magistrate-subtitle">Judicial Authority</div>
              </div>

              <div className="magistrate-card-footer">
                <span>
                  <Scale size={13} color="#38bdf8" /> Dossier Ready
                </span>
                <span>
                  <Sparkles size={13} color="#34d399" /> Evidence Locked
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}