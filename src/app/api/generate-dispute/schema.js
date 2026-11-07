const schema = {
  /* Headline name of the generated crisis or incident*/
  "scenario_title": "The Spoiled Banquet Catering Debacle",

  // Public briefing of what went wrong; visible to the player from the start
  "incident_summary": "At 11:30 PM, the catering kitchen walk-in freezer was left propped open, destroying $8,000 in perishable inventory.",

  // Omniscient ground truth; kept hidden from the player, passed to referee for fact-checking
  "ground_truth": {
    "culprit_id": "bilal",               // Unique ID of the character who actually caused the incident
    "actual_timeline": "Bilal sneaked into the kitchen at 11:10 PM using his keycard, propped the freezer with a towel, and fled at 11:25 PM.", // Objective, verifiable sequence of events
    "decisive_proof": "Keycard access logs at 11:10 PM and Bilal's gym bag left on the prep station." // The undeniable physical/digital evidence
  },

//   Roster of active suspects in the dispute
  "characters": [
    {
      "id": "tariq",                     // Unique identifier used to link dialogue turns and blame
      "name": "Tariq",                   // Display name rendered in the chat feed
      "role": "Head Chef & Eldest Bro",  // Professional or familial role in the scenario
      "temperament": "Defensive & Rigid",// Emotional demeanor influencing their speech
      "avatar_color": "#3b82f6"          // Hex code for badges, borders, and chat bubbles
    }
  ],

  // Scripted conversation turns presented sequentially in the group chat
  "dialogue_turns": [
    {
      "claim_id": "c1",                  // Unique ID for tracking resolved/unresolved state in React
      "speaker_id": "tariq",             // Matches an 'id' from the characters array
      "statement": "Bilal was in the kitchen because the lights were on, and he always forgets them.", // The exact line spoken in the chat
      "claim_type": "LOGICAL_FALLACY",   // "SOUND" | "FACTUAL_CONTRADICTION" | "LOGICAL_FALLACY"
      "flaw_description": "False Cause fallacy: leaving lights on does not prove physical presence at the freezer.", // Benchmark used by referee to verify player claims
      "concession_dialogue": "Fair point... just because the lights were on doesn't prove he touched the latch."   // Line uttered by the suspect when player successfully objects
    }
  ]
}