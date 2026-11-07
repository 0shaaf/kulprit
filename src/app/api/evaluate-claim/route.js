import { NextResponse } from "next/server";

const GROQ_MODEL = "openai/gpt-oss-120b";

export async function POST(req) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      is_valid: false,
      feedback: "Referee API offline. Objection overruled by default.",
      counter_argument: "The court cannot verify your claim right now.",
    });
  }

  try {
    const {
      incident_summary,
      ground_truth,
      speaker_name,
      statement,
      claim_type,
      flaw_description,
      user_reasoning,
    } = await req.json();

    const prompt = `
You are an impartial, strict judicial magistrate evaluating a player's objection in an investigation hearing.

DOSSIER FACTS:
${incident_summary}

STATEMENT UNDER QUESTION:
Speaker: "${speaker_name}"
Statement: "${statement}"
Official Statement Assessment: "${claim_type}"
Known Flaw (Ground Truth): "${flaw_description}"

PLAYER'S STATED OBJECTION REASONING:
"${user_reasoning}"

EVALUATION GATES (APPLY STRICTLY IN ORDER):

GATE 1: SUBSTANCE & RELEVANCE CHECK (ZERO TOLERANCE)
- If the player's reasoning is gibberish, filler, pure emotion, profanity, or completely unrelated (e.g., "hmmm", "idk", "wrong", "fake", "I like coffee", "liar", "no way", "objection", "lol"):
  -> MUST return is_valid: false!
  -> Do NOT sustain just because the statement itself has a known flaw! The player MUST articulate the problem.

GATE 2: MERIT CHECK
- Case A: Statement is "SOUND".
  -> The statement is factually accurate and logical based on the dossier.
  -> The objection CANNOT be sustained under any circumstances.
  -> MUST return is_valid: false.

- Case B: Statement is "FACTUAL_CONTRADICTION".
  -> The statement contradicts specific facts in the dossier.
  -> SUSAIN ONLY IF: The player's reasoning actually identifies the conflicting fact, badge time, log, or physical mismatch.
  -> If the player just says "it's false" or "it's a contradiction" without explaining WHAT fact contradicts it, return is_valid: false.

- Case C: Statement is "LOGICAL_FALLACY".
  -> The speaker made an ad hominem, false cause, hasty generalization, or emotional leap.
  -> SUSTAIN ONLY IF: The player's reasoning explains the bad reasoning (e.g., "distraction doesn't mean guilt", "past mistakes don't prove this crash", "attacking mood instead of evidence").
  -> If the reasoning doesn't identify the logical gap, return is_valid: false.

OUTPUT FORMAT:
Respond with raw JSON only (no markdown, no backticks, no explanations outside JSON):
{
  "is_valid": true or false,
  "feedback": "Short 1-2 sentence explanation of why the objection is accepted or rejected.",
  "counter_argument": "If is_valid is false, 1 snappy sentence from the speaker defending their statement against the player's weak point."
}
`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.1, // Near-zero temp to enforce strict grading
        max_tokens: 600,
        messages: [
          {
            role: "system",
            content:
              "You are a strict legal referee. Never validate an objection unless the player provided articulate, relevant reasoning that directly targets the flaw. Output RFC 8259 JSON only.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);

    const data = await res.json();
    let raw = data.choices?.[0]?.message?.content || "";
    raw = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      raw = raw.slice(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[evaluate-claim] Error:", err.message);
    return NextResponse.json({
      is_valid: false,
      feedback: "The court could not parse the objection reasoning.",
      counter_argument: "Your argument is unsubstantiated by the dossier.",
    });
  }
}