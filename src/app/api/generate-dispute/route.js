import { NextResponse } from "next/server";

const GROQ_MODEL = "openai/gpt-oss-20b";

const SEED_TOPICS = [
  "Exam Cheating Blame", "Hostel Fridge Milk Theft", "Ruined Final Presentation Slides",
  "Borrowed Laptop Screen Crack", "Lost Society Event Funds", "Hostel Curfew Gate Alarm",
  "Deleted Production Branch", "Unsent Client Invoice Debacle", "Overheating Server Rack",
  "Stolen Office Espresso Pods", "SaaS Outage During Pitch", "Supermarket Shoplifting Accusation",
  "Dropped Multi-Tier Wedding Cake", "Valet Scratch on Sports Car", "Crushed Camera Lens on Film Set",
  "Flooded Upstairs Bathroom", "Borrowed Car Fender Bender", "Shattered Heirloom China"
];

const SEED_SCENARIO = {
  scenario_title: "The Borrowed Car Fender Bender",
  incident_summary:
    "At 14:30, a rented company sedan was returned with front bumper damage.\n• Fact 1 (Access Log): Gate logs confirm @Jordan returned the vehicle at 14:28; @Alex was clocked out since 13:00.\n• Fact 2 (Forensics): White paint and concrete dust from parking pillar 4 are embedded into the front bumper scrape.\n• Fact 3 (Camera Record): Garage camera 2 captured @Jordan driving into pillar 4 while parking at 14:28.",
  ground_truth: {
    culprit_id: "c2",
    actual_timeline: "Jordan scraped the front bumper against pillar 4 while parking at 14:28.",
    decisive_proof: "Garage camera 2 footage directly shows Jordan hitting pillar 4 at 14:28."
  },
  characters: [
    { id: "c1", name: "Taylor", role: "Biased Accuser", temperament: "Aggressive", avatar_color: "#ef4444" },
    { id: "c2", name: "Jordan", role: "Borrower & Culprit", temperament: "Evasive", avatar_color: "#f59e0b" },
    { id: "c3", name: "Alex", role: "Fleet Manager", temperament: "Objective", avatar_color: "#38bdf8" }
  ],
  dialogue_turns: [
    {
      claim_id: "t1",
      speaker_id: "c1",
      target_id: "c3",
      stance: "ACCUSES",
      statement: "@Alex was irritated this morning, so he must have wrecked the car out of spite.",
      claim_type: "LOGICAL_FALLACY",
      flaw_description: "Ad Hominem: mood is not proof of causing vehicle damage.",
      concession_dialogue: "You are right, anger does not prove vehicle damage."
    },
    {
      claim_id: "t2",
      speaker_id: "c2",
      target_id: "c2",
      stance: "DEFENDS",
      statement: "I lost my keycard and left at 14:00, well before the car returned.",
      claim_type: "FACTUAL_CONTRADICTION",
      flaw_description: "Directly contradicts Fact 1: gate logs confirm Jordan returned at 14:28.",
      concession_dialogue: "Okay... the gate log does record me at 14:28."
    },
    {
      claim_id: "t3",
      speaker_id: "c3",
      target_id: "c2",
      stance: "ACCUSES",
      statement: "The bumper damage contains white pillar concrete dust matching Fact 2.",
      claim_type: "SOUND",
      flaw_description: "Accurate physical evidence matching Fact 2 in the dossier.",
      concession_dialogue: "Yes, the pillar concrete dust matches Fact 2."
    },
    {
      claim_id: "t4",
      speaker_id: "c1",
      target_id: "c3",
      stance: "ACCUSES",
      statement: "@Alex manages the keys, which logically proves he caused the bumper damage.",
      claim_type: "LOGICAL_FALLACY",
      flaw_description: "False Cause fallacy: handling keys does not cause exterior collision damage.",
      concession_dialogue: "Fair point, managing keys does not cause a crash."
    },
    {
      claim_id: "t5",
      speaker_id: "c2",
      target_id: "c2",
      stance: "DEFENDS",
      statement: "The car only has rear trunk damage; the front bumper is untouched.",
      claim_type: "FACTUAL_CONTRADICTION",
      flaw_description: "Directly contradicts Fact 2: the dossier explicitly documents front bumper damage.",
      concession_dialogue: "Alright, the damage is on the front bumper..."
    },
    {
      claim_id: "t6",
      speaker_id: "c3",
      target_id: "c2",
      stance: "ACCUSES",
      statement: "Garage camera 2 captured @Jordan striking pillar 4, as documented in Fact 3.",
      claim_type: "SOUND",
      flaw_description: "Directly supported by the Camera Record in Fact 3 of the dossier.",
      concession_dialogue: "The garage camera record in Fact 3 is clear."
    }
  ]
};

function parseAndHealJson(rawContent) {
  let clean = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const firstBrace = clean.indexOf("{");
  if (firstBrace === -1) throw new Error("No opening brace detected");

  clean = clean.slice(firstBrace).trim();

  const quickSanitize = (str) =>
    str
      .replace(/\}\s*\n*\s*\{/g, "},\n{")
      .replace(/,\s*([}\]])/g, "$1")
      .trim();

  try {
    return JSON.parse(quickSanitize(clean));
  } catch (err) {}

  let searchIdx = clean.length;
  while (searchIdx > firstBrace) {
    const lastBrace = clean.lastIndexOf("}", searchIdx);
    if (lastBrace === -1) break;

    const slice = clean.slice(0, lastBrace + 1);
    const candidates = [slice, slice + "\n  ]\n}", slice + "\n}"];

    for (const cand of candidates) {
      try {
        const parsed = JSON.parse(quickSanitize(cand));
        if (parsed.scenario_title && parsed.dialogue_turns?.length >= 4) {
          return parsed;
        }
      } catch (e) {}
    }
    searchIdx = lastBrace - 1;
  }

  throw new Error("Unable to reconstruct valid JSON from output stream.");
}

export async function POST() {
  const apiKey = process.env.GROQ_API_KEY;

  if (apiKey) {
    const chosenTopic = SEED_TOPICS[Math.floor(Math.random() * SEED_TOPICS.length)];
    const prompt = `
You are an expert game designer generating a procedural legal deduction dispute for the game "Kulprit".

OUTPUT STRICT RFC 8259 JSON ONLY. NO MARKDOWN, NO THINK TAGS, NO INTRO/OUTRO.

RULES FOR THE CLOSED EVIDENCE DOSSIER (incident_summary):
- You must create a dispute involving 3 distinct characters:
  1. The Accuser (biased, relies on logical fallacies like ad hominem or hasty generalizations).
  2. The Actual Culprit (lies about timeline or physical evidence).
  3. The Innocent Person of Interest (truthful, framed by the accuser).
- The dossier MUST contain exactly 3 objective, verifiable facts:
  * Fact 1: Timeline / Alibi constraint (e.g., electronic door swipe, login log, receipt time).
  * Fact 2: Physical / Environmental state (e.g., item location, weight, residue, room layout).
  * Fact 3: Neutral Corroboration (e.g., third-party log, weather, power outage log).
- CRITICAL MYSTERY RULE: NEVER state who committed the deed in the facts. NO security camera footage showing the theft/act. NO confessions. The facts must be 100% neutral telemetry. Guilt must ONLY be deductible by catching lies or fallacies in the dialogue.

RULES FOR DIALOGUE TURNS:
- Generate 6 to 9 dialogue turns.
- CRITICAL CHARACTER INTEGRITY: Every statement MUST be spoken by and reference ONLY the 3 characters defined in this scenario. 
- NEVER use placeholder names (e.g., do NOT mention Alex, Liam, Jordan, or slides/cars unless they are explicitly in the generated characters list and incident).
- Statements must be conversational disputes (e.g. "@CharacterName claims X, but that makes no sense").
- Claim types:
  * "SOUND": Factually correct and logically sound.
  * "LOGICAL_FALLACY": An invalid causal leap (e.g., "They were stressed, so they stole it").
  * "FACTUAL_CONTRADICTION": Directly contradicts Fact 1, 2, or 3 from the dossier.

JSON FORMAT SCHEMA:
{
  "scenario_title": "Short punchy title",
  "incident_summary": "- Fact 1: ...\\n- Fact 2: ...\\n- Fact 3: ...",
  "characters": [
    {
      "id": "char_1",
      "name": "Full Name",
      "role": "Accuser",
      "temperament": "Aggressive / Defensive / etc",
      "avatar_color": "#hex"
    },
    {
      "id": "char_2",
      "name": "Full Name",
      "role": "Actual Culprit",
      "temperament": "Evasive / Nervous / etc",
      "avatar_color": "#hex"
    },
    {
      "id": "char_3",
      "name": "Full Name",
      "role": "Innocent Truth-Teller",
      "temperament": "Calm / Analytical / etc",
      "avatar_color": "#hex"
    }
  ],
  "ground_truth": {
    "culprit_id": "char_2",
    "true_sequence": "1-2 sentence explanation of what really happened"
  },
  "dialogue_turns": [
    {
      "claim_id": "turn_1",
      "speaker_id": "char_1",
      "target_id": "char_3",
      "statement": "Dialogue line targeting another character by @Name",
      "claim_type": "LOGICAL_FALLACY",
      "flaw_description": "Why this statement is flawed or what fact it violates",
      "stance": "ACCUSES",
      "concession_dialogue": "What the speaker concedes if sustained"
    }
  ]
}
`;
  

    try {
      console.log(`[generate-dispute] Generating strict synchronized case: "${chosenTopic}"...`);
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          temperature: 0.25, // Lower temperature to strictly honor fact anchors
          max_tokens: 4000,
          messages: [
            {
              role: "system",
              content:
                "You are an automated API backend that outputs raw RFC 8259 JSON only. Strictly lock dialogue to the 3 facts in incident_summary. Never introduce outside names.",
            },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);

      const data = await res.json();
      const rawContent = data.choices?.[0]?.message?.content || "";
      const parsed = parseAndHealJson(rawContent); // hi

      return NextResponse.json(parsed);
    } catch (err) {
      console.warn("[generate-dispute] API failed, serving verified seed scenario:", err.message);
      return NextResponse.json(SEED_SCENARIO);
    }
  }

  return NextResponse.json(SEED_SCENARIO);
}