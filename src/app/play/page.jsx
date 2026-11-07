"use client";

import { useState, useEffect, useRef } from "react";
import {
  Loader2,
  Scale,
  FileText,
  Users,
  Check,
  HelpCircle,
  Clock,
  Menu,
  X,
  Sparkles,
  Play,
} from "lucide-react";
import "./game.css";

const AVATAR_FILES = [
  "/avatars/1.png",
  "/avatars/2.png",
  "/avatars/3.png",
  "/avatars/4.png",
  "/avatars/5.png",
];

export default function PlayPage() {
  const [scenario, setScenario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentTurnIdx, setCurrentTurnIdx] = useState(0);
  const [credibility, setCredibility] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [awaitingDecision, setAwaitingDecision] = useState(false);
  const [isObjecting, setIsObjecting] = useState(false);
  const [userReasoning, setUserReasoning] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [verdictData, setVerdictData] = useState(null);
  const [showVerdictModal, setShowVerdictModal] = useState(false);
  const [revealTruthInChat, setRevealTruthInChat] = useState(false);

  const timerRef = useRef(null);
  const chatBottomRef = useRef(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!revealTruthInChat) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, awaitingDecision, isObjecting, revealTruthInChat]);

  // Turn Countdown (Runs strictly after game has started)
  useEffect(() => {
    if (!hasStarted || !awaitingDecision || gameOver) {
      clearInterval(timerRef.current);
      return;
    }

    setSecondsLeft(60);
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [hasStarted, awaitingDecision, currentTurnIdx, gameOver]);

  // Timeout Watchdog
  useEffect(() => {
    if (hasStarted && secondsLeft === 0 && awaitingDecision && !gameOver) {
      clearInterval(timerRef.current);
      handleAgree(true);
    }
  }, [hasStarted, secondsLeft, awaitingDecision, gameOver]);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    initGame();
  }, []);

  async function initGame() {
    setLoading(true);
    try {
      const res = await fetch("/api/generate-dispute", { method: "POST" });
      const data = await res.json();

      const shuffledAvatars = [...AVATAR_FILES].sort(() => 0.5 - Math.random());
      const charactersWithAvatars = data.characters.map((char, index) => ({
        ...char,
        avatar_img: shuffledAvatars[index % shuffledAvatars.length],
      }));

      const enrichedScenario = {
        ...data,
        characters: charactersWithAvatars,
      };

      setScenario(enrichedScenario);

      const initCreds = {};
      enrichedScenario.characters.forEach((c) => {
        initCreds[c.id] = 70;
      });
      setCredibility(initCreds);

      const firstTurn = enrichedScenario.dialogue_turns[0];
      setMessages([
        {
          id: firstTurn.claim_id,
          speaker_id: firstTurn.speaker_id,
          statement: firstTurn.statement,
          type: "dialogue",
        },
      ]);
      setCurrentTurnIdx(0);
    } catch (err) {
      console.error(err);
      alert("Failed to load hearing: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Step 1: Open Case Briefing
  function handlePlayClick() {
    setShowBriefing(true);
  }

  // Step 2: Start the Active Game
  function handleStartGame() {
    setShowBriefing(false);
    setHasStarted(true);
    setAwaitingDecision(true);
    setSecondsLeft(60);
  }

  function getSafeRole(role, isRevealed = false) {
    if (isRevealed) return role;
    if (!role) return "Person of Interest";

    const lower = role.toLowerCase();
    if (
      lower.includes("culprit") ||
      lower.includes("innocent") ||
      lower.includes("accuser")
    ) {
      return "Person of Interest";
    }
    return role;
  }

  function handleAgree(wasTimeout = false) {
    if (!scenario || !awaitingDecision) return;
    setAwaitingDecision(false);
    setIsObjecting(false);

    const activeTurn = scenario.dialogue_turns[currentTurnIdx];
    const targetId = activeTurn.target_id || activeTurn.speaker_id;

    const nextCred = { ...credibility };
    if (activeTurn.stance === "ACCUSES") {
      nextCred[targetId] = Math.max(10, (nextCred[targetId] ?? 70) - 15);
    } else {
      nextCred[targetId] = Math.min(100, (nextCred[targetId] ?? 70) + 10);
    }
    setCredibility(nextCred);

    if (wasTimeout) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ref-timeout-${crypto.randomUUID()}`,
          type: "system_blob",
          text: "Decision window elapsed. Statement accepted into the hearing record.",
        },
      ]);
    }

    advanceDialogue(nextCred);
  }

  async function handleSubmitObjection() {
    if (!userReasoning.trim() || evaluating) return;
    setEvaluating(true);

    const activeTurn = scenario.dialogue_turns[currentTurnIdx];
    const speaker = scenario.characters.find((c) => c.id === activeTurn.speaker_id);
    const targetId = activeTurn.target_id || activeTurn.speaker_id;

    try {
      const res = await fetch("/api/evaluate-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident_summary: scenario.incident_summary,
          ground_truth: scenario.ground_truth,
          speaker_name: speaker?.name || "Unknown",
          statement: activeTurn.statement,
          claim_type: activeTurn.claim_type,
          flaw_description: activeTurn.flaw_description,
          user_reasoning: userReasoning,
        }),
      });

      const result = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: `obj-${crypto.randomUUID()}`,
          type: "magistrate_objection",
          text: userReasoning,
        },
      ]);

      const nextCred = { ...credibility };

      if (result.is_valid) {
        if (activeTurn.stance === "ACCUSES") {
          nextCred[targetId] = Math.min(100, (nextCred[targetId] ?? 70) + 25);
          nextCred[activeTurn.speaker_id] = Math.max(10, (nextCred[activeTurn.speaker_id] ?? 70) - 20);
        } else {
          nextCred[targetId] = Math.max(10, (nextCred[targetId] ?? 70) - 30);
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `conc-${crypto.randomUUID()}`,
            speaker_id: activeTurn.speaker_id,
            statement: activeTurn.concession_dialogue || "Fair point...",
            type: "dialogue",
          },
          {
            id: `ref-${crypto.randomUUID()}`,
            type: "system_blob",
            text: `Objection sustained: ${result.feedback}`,
          },
        ]);
      } else {
        if (activeTurn.stance === "ACCUSES") {
          nextCred[targetId] = Math.max(10, (nextCred[targetId] ?? 70) - 15);
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `rebut-${crypto.randomUUID()}`,
            speaker_id: activeTurn.speaker_id,
            statement: result.counter_argument || "That doesn't refute what happened.",
            type: "dialogue",
          },
          {
            id: `ref-${crypto.randomUUID()}`,
            type: "system_blob",
            text: `Objection overruled: ${result.feedback}`,
          },
        ]);
      }

      setCredibility(nextCred);
      setIsObjecting(false);
      setUserReasoning("");
      setAwaitingDecision(false);
      advanceDialogue(nextCred);
    } catch (err) {
      console.error(err);
      alert("Evaluation failed: " + err.message);
    } finally {
      setEvaluating(false);
    }
  }

  function advanceDialogue(latestCreds) {
    const nextIdx = currentTurnIdx + 1;
    if (nextIdx >= scenario.dialogue_turns.length) {
      concludeGame(latestCreds);
      return;
    }

    setCurrentTurnIdx(nextIdx);
    const nextTurn = scenario.dialogue_turns[nextIdx];

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: nextTurn.claim_id,
          speaker_id: nextTurn.speaker_id,
          statement: nextTurn.statement,
          type: "dialogue",
        },
      ]);
      setAwaitingDecision(true);
    }, 500);
  }

  function concludeGame(finalCreds) {
    setGameOver(true);
    setAwaitingDecision(false);

    let minScore = 999;
    let framedCharId = null;

    Object.entries(finalCreds).forEach(([id, score]) => {
      if (score < minScore) {
        minScore = score;
        framedCharId = id;
      }
    });

    const framedChar = scenario.characters.find((c) => c.id === framedCharId);
    const actualCulprit = scenario.characters.find(
      (c) => c.id === scenario.ground_truth.culprit_id
    );
    const won = framedCharId === scenario.ground_truth.culprit_id;

    setVerdictData({ won, framedChar, actualCulprit, score: minScore });

    setTimeout(() => {
      setShowVerdictModal(true);
    }, 700);
  }

  function getCredibilityColor(score) {
    if (score >= 65) return "var(--status-stable)";
    if (score >= 40) return "var(--status-watch)";
    return "var(--status-danger)";
  }

  function formatDiscordStatement(text) {
    if (!text) return "";
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        return (
          <span key={index} className="discord-mention">
            {part}
          </span>
        );
      }
      return part;
    });
  }

  if (loading) {
    return (
      <div className="friendly-loader-container">
        <Loader2 className="friendly-spinner" size={32} />
        <span className="friendly-loader-text">Preparing the hearing for you...</span>
      </div>
    );
  }

  return (
    <div className="discord-app">
      {/* STAGE 1: WELCOME MODAL */}
      {!hasStarted && !showBriefing && scenario && (
        <div className="modal-overlay">
          <div className="start-dialog">
            <div className="judge-avatar-frame">
              <img
                src="/avatars/judge.png"
                alt="Magistrate"
                className="judge-avatar-img"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  if (e.currentTarget.nextSibling) {
                    e.currentTarget.nextSibling.style.display = "flex";
                  }
                }}
              />
              <div className="judge-avatar-fallback" style={{ display: "none" }}>
                <Scale size={36} />
              </div>
            </div>

            <h1 className="start-title">Welcome, Magistrate!</h1>
            <p className="start-description">
              The investigation room is ready. Review the dossier facts, spot contradictions,
              and cross-examine the witnesses to uncover the true culprit.
            </p>

            <button className="hero-split-btn" onClick={handlePlayClick}>
              <span className="hero-split-main">Play</span>
              <span className="hero-split-icon">
                <Play size={14} fill="currentColor" />
              </span>
            </button>
          </div>
        </div>
      )}

      {/* STAGE 2: CASE BRIEFING MODAL */}
      {!hasStarted && showBriefing && scenario && (
        <div className="modal-overlay">
          <div className="briefing-dialog">
            <h2 className="briefing-title">{scenario.scenario_title}</h2>
            <div className="briefing-summary-box">
              {scenario.incident_summary}
            </div>
            <button className="btn-simple-start" onClick={handleStartGame}>
              Start
            </button>
          </div>
        </div>
      )}

      {/* DRAWER BACKDROP (Mobile & Tablet) */}
      {sidebarOpen && (
        <div className="drawer-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* MOBILE TOP HUD DOCK */}
      <div className="mobile-hud-dock">
        <div className="mobile-hud-left">
          <button
            className="mobile-hud-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle Dossier"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <div className="mobile-standings-cluster">
          {scenario.characters.map((char) => {
            const score = credibility[char.id] ?? 70;
            const radius = 11;
            const circ = 2 * Math.PI * radius;
            const offset = circ - (score / 100) * circ;
            const color = getCredibilityColor(score);

            return (
              <div key={char.id} className="mobile-witness-pill" title={`${char.name}: ${score}%`}>
                <div className="mobile-witness-avatar-frame">
                  <svg className="mobile-witness-svg-ring" width="26" height="26">
                    <circle stroke="rgba(255,255,255,0.08)" strokeWidth="2" fill="transparent" r={radius} cx="13" cy="13" />
                    <circle
                      stroke={color}
                      strokeWidth="2"
                      strokeDasharray={circ}
                      strokeDashoffset={offset}
                      strokeLinecap="round"
                      fill="transparent"
                      r={radius}
                      cx="13"
                      cy="13"
                    />
                  </svg>
                  <img
                    src={char.avatar_img}
                    alt={char.name}
                    className="mobile-witness-avatar-img"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                </div>
                <span className="mobile-witness-score" style={{ color }}>
                  {score}%
                </span>
              </div>
            );
          })}
        </div>

        <div className={`mobile-timer-pill ${secondsLeft <= 15 ? "danger" : ""}`}>
          <Clock size={13} />
          <span>{String(secondsLeft).padStart(2, "0")}s</span>
        </div>
      </div>

      {/* LEFT PANEL: Case Dossier */}
      <aside className={`left-dossier-panel ${sidebarOpen ? "open" : ""}`}>
        <div className="dossier-header">
          <div className="dossier-header-title">
            <FileText size={16} />
            <span>Case Dossier</span>
          </div>
          <button
            className="mobile-hud-btn"
            style={{ width: "28px", height: "28px", display: sidebarOpen ? "flex" : "none" }}
            onClick={() => setSidebarOpen(false)}
          >
            <X size={15} />
          </button>
        </div>

        <div className="dossier-content">
          <h2 className="case-title">{scenario.scenario_title}</h2>
          <div className="case-summary-box">{scenario.incident_summary}</div>

          <div className="section-label centered">
            <Users size={13} />
            <span>Involved Parties</span>
          </div>

          <div className="character-roster">
            {scenario.characters.map((char) => (
              <div key={char.id} className="character-chip">
                <img
                  src={char.avatar_img}
                  alt={char.name}
                  className="char-avatar-img"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    if (e.currentTarget.nextSibling) {
                      e.currentTarget.nextSibling.style.display = "flex";
                    }
                  }}
                />
                <div
                  className="char-chip-avatar"
                  style={{ display: "none", backgroundColor: char.avatar_color }}
                >
                  {char.name[0]}
                </div>

                <div className="char-chip-details">
                  <span className="char-chip-name">{char.name}</span>
                  <span className="char-chip-role">
                    {getSafeRole(char.role, revealTruthInChat)} • {char.temperament}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="magistrate-profile-card">
          <div className="magistrate-avatar-frame">
            <div className="magistrate-avatar">
              <Scale size={18} />
            </div>
            <div className="magistrate-status-dot"></div>
          </div>
          <div className="magistrate-info">
            <span className="magistrate-name">Magistrate</span>
            <span className="magistrate-rank">Presiding Arbitrator</span>
          </div>
        </div>
      </aside>

      {/* CENTER PANEL: Live Hearing Chat */}
      <main className="center-chat-panel">
        <header className="chat-header-bar">
          <div className="chat-header-info">
            <button
              className="mobile-hud-btn header-hamburger-trigger"
              style={{ display: "none", marginRight: "4px" }}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={16} />
            </button>
            <span className="chat-channel-tag">#</span>
            <span className="chat-channel-title">investigation-hearing</span>
          </div>

          {revealTruthInChat ? (
            <button className="btn-return-verdict" onClick={() => setShowVerdictModal(true)}>
              View Final Verdict
            </button>
          ) : (
            <div className="chat-turn-indicator">
              Turn {currentTurnIdx + 1} <span>of {scenario.dialogue_turns.length}</span>
            </div>
          )}
        </header>

        {revealTruthInChat && (
          <div className="post-mortem-banner">
            <Sparkles size={15} color="var(--accent-blue)" />
            <span>Case Study Review: Exposing the flaws, lies, and verified evidence behind each turn.</span>
          </div>
        )}

        <div className="chat-feed-scroll">
          {messages.map((msg) => {
            if (msg.type === "system_blob") {
              return (
                <div key={msg.id} className="system-embed-blob">
                  <div className="system-embed-blob-icon">
                    <Sparkles size={14} />
                  </div>
                  <span className="system-embed-blob-text">{msg.text}</span>
                </div>
              );
            }

            if (msg.type === "magistrate_objection") {
              return (
                <div key={msg.id} className="chat-message-row" style={{ alignSelf: "flex-end" }}>
                  <div className="msg-body" style={{ alignItems: "flex-end" }}>
                    <div className="msg-meta">
                      <span className="msg-author" style={{ color: "var(--accent-blue)" }}>Magistrate</span>
                      <span className="msg-role-tag">Objection</span>
                    </div>
                    <div className="msg-bubble msg-bubble-objection">
                      "{msg.text}"
                    </div>
                  </div>
                  <div className="msg-avatar" style={{ background: "rgba(56, 189, 248, 0.15)", color: "var(--accent-blue)" }}>
                    <Scale size={16} />
                  </div>
                </div>
              );
            }

            const speaker = scenario.characters.find((c) => c.id === msg.speaker_id);
            const turnData = scenario.dialogue_turns.find((t) => t.claim_id === msg.id);

            return (
              <div key={msg.id} className="chat-message-row">
                <img
                  src={speaker?.avatar_img}
                  alt={speaker?.name || "?"}
                  className="msg-avatar"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    if (e.currentTarget.nextSibling) {
                      e.currentTarget.nextSibling.style.display = "flex";
                    }
                  }}
                />
                <div
                  className="msg-avatar"
                  style={{ display: "none", backgroundColor: speaker?.avatar_color || "#27272a" }}
                >
                  {speaker?.name?.[0] || "?"}
                </div>

                <div className="msg-body">
                  <div className="msg-meta">
                    <span className="msg-author">{speaker?.name}</span>
                    <span className="msg-role-tag">{getSafeRole(speaker?.role, revealTruthInChat)}</span>
                  </div>
                  <div className="msg-bubble">{formatDiscordStatement(msg.statement)}</div>

                  {revealTruthInChat && turnData && (
                    <div className={`forensic-badge-card ${turnData.claim_type}`}>
                      <div className="forensic-badge-header">
                        <span className={`forensic-tag ${turnData.claim_type}`}>
                          {turnData.claim_type.replace("_", " ")}
                        </span>
                        <span className="forensic-stance">
                          {turnData.stance === "ACCUSES" ? "Targeting" : "Defending"}:{" "}
                          <strong>{scenario.characters.find((c) => c.id === turnData.target_id)?.name}</strong>
                        </span>
                      </div>
                      <div className="forensic-explanation">
                        {turnData.flaw_description}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={chatBottomRef} />
        </div>

        {/* FLOATING ACTION BAR */}
        {hasStarted && awaitingDecision && !gameOver && (
          <div className="chat-action-container">
            <div className={`action-bar-dock ${isObjecting ? "expanded" : ""}`}>
              {!isObjecting ? (
                <>
                  <div className="action-prompt-playful">
                    <span>Your thoughts ?</span>
                  </div>
                  <div className="action-button-group">
                    <button className="btn-pill-agree" onClick={() => handleAgree(false)}>
                      <Check size={14} />
                      Sounds Good
                    </button>
                    <button className="btn-pill-disagree" onClick={() => setIsObjecting(true)}>
                      <HelpCircle size={14} />
                      Something's Fishy
                    </button>
                  </div>
                </>
              ) : (
                <div className="objection-input-pane">
                  <textarea
                    className="objection-textarea"
                    placeholder="Spot the discrepancy or fallacy against the dossier..."
                    value={userReasoning}
                    onChange={(e) => setUserReasoning(e.target.value)}
                    autoFocus
                  />
                  <div className="objection-submit-row">
                    <button className="btn-pill-agree" onClick={() => setIsObjecting(false)}>
                      Cancel
                    </button>
                    <button
                      className="btn-pill-disagree"
                      disabled={evaluating}
                      onClick={handleSubmitObjection}
                    >
                      {evaluating ? (
                        <>
                          <Loader2 size={13} className="friendly-spinner" />
                          Evaluating...
                        </>
                      ) : (
                        "File Objection"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* RIGHT PANEL */}
      <aside className="right-stats-panel">
        <div className="countdown-box">
          <div className="timer-left">
            <span className="timer-label">Decision Window</span>
            <span className={`timer-clock ${secondsLeft <= 15 ? "pulse-danger" : ""}`}>
              00:{String(secondsLeft).padStart(2, "0")}
            </span>
          </div>
          <Clock size={20} color={secondsLeft <= 15 ? "var(--status-danger)" : "var(--status-stable)"} />
        </div>

        <div className="credibility-section">
          <div className="section-label">
            <Users size={13} />
            <span>Witness Standings</span>
          </div>

          {scenario.characters.map((char) => {
            const score = credibility[char.id] ?? 70;
            const radius = 22;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset = circumference - (score / 100) * circumference;
            const color = getCredibilityColor(score);

            return (
              <div key={char.id} className="credibility-card">
                <div className="credibility-char-info">
                  <span className="cred-char-name">{char.name}</span>
                  <span className="cred-char-role">{getSafeRole(char.role, revealTruthInChat)}</span>
                  <span className="cred-status-indicator" style={{ color }}>
                    {score <= 35 ? "High Suspicion" : score <= 60 ? "Vulnerable" : "Credible"}
                  </span>
                </div>

                <div className="circle-progress-wrapper">
                  <svg className="circle-progress-svg" width="54" height="54">
                    <circle className="circle-bg" strokeWidth="4" fill="transparent" r={radius} cx="27" cy="27" />
                    <circle
                      className="circle-bar"
                      stroke={color}
                      strokeWidth="4"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      r={radius}
                      cx="27"
                      cy="27"
                    />
                  </svg>
                  <span className="circle-percent-text">{score}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* VERDICT MODAL */}
      {showVerdictModal && verdictData && (
        <div className="modal-overlay">
          <div className="verdict-dialog">
            <div className="jail-cell-frame">
              <img
                src={verdictData.framedChar?.avatar_img}
                alt={verdictData.framedChar?.name}
                className="jail-char-avatar"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  if (e.currentTarget.nextSibling) {
                    e.currentTarget.nextSibling.style.display = "flex";
                  }
                }}
              />
              <div
                className="jail-char-avatar"
                style={{
                  display: "none",
                  backgroundColor: verdictData.framedChar?.avatar_color,
                }}
              >
                {verdictData.framedChar?.name?.[0]}
              </div>

              <div className="jail-bars-overlay">
                <div className="jail-bar"></div>
                <div className="jail-bar"></div>
                <div className="jail-bar"></div>
                <div className="jail-bar"></div>
                <div className="jail-bar"></div>
              </div>
            </div>

            <h2 className={`verdict-title ${verdictData.won ? "win" : "lose"}`}>
              {verdictData.won ? "Justice Served" : "Miscarriage of Justice"}
            </h2>

            <p className="verdict-description">
              {verdictData.won ? (
                <>
                  You dismantled the deception. <strong>{verdictData.framedChar?.name}</strong> was convicted with an integrity score of <strong>{verdictData.score}%</strong>.
                </>
              ) : (
                <>
                  An innocent party took the blame. <strong>{verdictData.framedChar?.name}</strong> was framed at <strong>{verdictData.score}%</strong>, while the actual culprit <strong>{verdictData.actualCulprit?.name}</strong> avoided scrutiny.
                </>
              )}
            </p>

            <div style={{ display: "flex", gap: "10px", width: "100%", marginTop: "8px" }}>
              <button
                className="btn-pill-agree"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => {
                  setShowVerdictModal(false);
                  setRevealTruthInChat(true);
                }}
              >
                Review Case Log
              </button>
              <button
                className="btn-pill-disagree"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => window.location.reload()}
              >
                Next Case
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}