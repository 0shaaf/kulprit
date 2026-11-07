import { NextResponse } from "next/server";

const GROQ_MODEL = "openai/gpt-oss-120b";

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
Create an investigation dispute script based on: "${chosenTopic}".

STRICT FAIR-PLAY EVIDENCE CONTRACT:
1. THREE SPECIFIC HUMAN CHARACTERS:
   - Invent 3 distinct, realistic first names suited for the setting (e.g. A Human Name).
   - NEVER use the literal word "Name", "c1", or generic placeholders.
   - Character Roles:
     * c1: The "Biased Accuser". Makes 2 LOGICAL_FALLACIES targeting c3.
     * c2: The "Actual Culprit" (culprit_id MUST be "c2"). Makes 2 FACTUAL_CONTRADICTIONS lying about the facts.
     * c3: The "Innocent Truth-Teller". Makes 2 SOUND statements citing facts from the dossier.
   - NO 4th PERSON: Only c1, c2, and c3 exist in the entire case.

2. INCIDENT SUMMARY (EXACTLY 3 FACT BULLETS):
   Must be formatted with linebreaks as:
   Incident headline
   • Fact 1 (Timeline/Access): Stating timestamps/logs for @[c2's Name] and @[c3's Name].
   • Fact 2 (Physical Evidence): Stating forensic proof (fingerprint, chemical, damaged part) linking @[c2's Name].
   • Fact 3 (Decisive Verification): Stating the camera footage or system log proving @[c2's Name]'s act.

3. CLOSED EVIDENCE POOL IN DIALOGUE:
   - Every statement MUST mention other characters by their actual handle: '@' followed immediately by their chosen name (e.g. '@Maya', '@Victor').
   - Turn t1 (c1 -> c3): LOGICAL_FALLACY attacking c3's mood/habits.
   - Turn t2 (c2 -> c2): FACTUAL_CONTRADICTION lying about Fact 1.
   - Turn t3 (c3 -> c2): SOUND citing Fact 2.
   - Turn t4 (c1 -> c3): LOGICAL_FALLACY attacking c3 with false cause.
   - Turn t5 (c2 -> c2): FACTUAL_CONTRADICTION lying about Fact 2.
   - Turn t6 (c3 -> c2): SOUND citing Fact 3.

4. BREVITY: Statements under 14 words.
5. Start immediately with '{' and end with '}'. No markdown backticks.

MIRROR THIS EXACT SCHEMA (replace all bracketed values with your generated scenario content):
{
  "scenario_title": "string",
  "incident_summary": "Headline\\n• Fact 1 (Timeline/Access): ...\\n• Fact 2 (Physical Evidence): ...\\n• Fact 3 (Decisive Verification): ...",
  "ground_truth": {
    "culprit_id": "c2",
    "actual_timeline": "string",
    "decisive_proof": "string"
  },
  "characters": [
    { "id": "c1", "name": "Liam", "role": "Accuser", "temperament": "Aggressive", "avatar_color": "#ef4444" },
    { "id": "c2", "name": "Maya", "role": "Culprit", "temperament": "Evasive", "avatar_color": "#f59e0b" },
    { "id": "c3", "name": "Victor", "role": "Innocent Witness", "temperament": "Objective", "avatar_color": "#38bdf8" }
  ],
  "dialogue_turns": [
    { "claim_id": "t1", "speaker_id": "c1", "target_id": "c3", "stance": "ACCUSES", "statement": "@Victor was nervous all morning, so he obviously caused the break.", "claim_type": "LOGICAL_FALLACY", "flaw_description": "Ad hominem: nervousness is not proof of causing damage.", "concession_dialogue": "Fair point, nervousness proves nothing." },
    { "claim_id": "t2", "speaker_id": "c2", "target_id": "c2", "stance": "DEFENDS", "statement": "I checked out at 13:00, way before the incident occurred.", "claim_type": "FACTUAL_CONTRADICTION", "flaw_description": "Contradicts Fact 1: door log proves Maya entered at 14:15.", "concession_dialogue": "Okay... the door log does show 14:15." },
    { "claim_id": "t3", "speaker_id": "c3", "target_id": "c2", "stance": "ACCUSES", "statement": "The broken piece has tool marks matching @Maya's assigned wrench kit.", "claim_type": "SOUND", "flaw_description": "Directly supported by the tool mark match in Fact 2.", "concession_dialogue": "Yes, that wrench kit is registered to me." },
    { "claim_id": "t4", "speaker_id": "c1", "target_id": "c3", "stance": "ACCUSES", "statement": "@Victor has broken coffee mugs before, so this accident was definitely him.", "claim_type": "LOGICAL_FALLACY", "flaw_description": "Hasty generalization: past broken mugs do not prove this incident.", "concession_dialogue": "True, past accidents don't prove this one." },
    { "claim_id": "t5", "speaker_id": "c2", "target_id": "c2", "stance": "DEFENDS", "statement": "My wrench kit never left the basement storage locker today.", "claim_type": "FACTUAL_CONTRADICTION", "flaw_description": "Contradicts Fact 2: tool residue was found active at the workbench.", "concession_dialogue": "I brought it upstairs earlier, fine." },
    { "claim_id": "t6", "speaker_id": "c3", "target_id": "c2", "stance": "ACCUSES", "statement": "Hallway camera feed in Fact 3 shows @Maya carrying the broken item away.", "claim_type": "SOUND", "flaw_description": "Directly verified by the camera recording cited in Fact 3.", "concession_dialogue": "The hallway recording clearly shows me." }
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
      const parsed = parseAndHealJson(rawContent);

      return NextResponse.json(parsed);
    } catch (err) {
      console.warn("[generate-dispute] API failed, serving verified seed scenario:", err.message);
      return NextResponse.json(SEED_SCENARIO);
    }
  }

  return NextResponse.json(SEED_SCENARIO);
}