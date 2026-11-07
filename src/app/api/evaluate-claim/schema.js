const schema = {
  // Title of the active scenario for high-level topical context
  "scenario_title": "The Spoiled Banquet Catering Debacle",

  // Baseline incident briefing to verify user references to public facts
  "incident_summary": "At 11:30 PM, the catering kitchen walk-in freezer was left propped open...",

  // Full omniscient truth object; allows referee to spot false user claims vs real contradictions
  "ground_truth": {
    "culprit_id": "bilal",              // The true culprit according to game rules
    "actual_timeline": "...",            // Undeniable chronological timeline of who was where
    "decisive_proof": "..."              // Smoking gun physical/digital logs
  },

  // Display name of the suspect whose message is currently on the stand
  "speaker_name": "Tariq",

  // The exact sentence the suspect just posted in the chat
  "statement": "Bilal was in the kitchen because the lights were on...",

  // Pre-determined classification: "SOUND" | "FACTUAL_CONTRADICTION" | "LOGICAL_FALLACY"
  "claim_type": "LOGICAL_FALLACY",

  // Target explanation of the flaw that the referee compares the player's argument against
  "flaw_description": "False Cause fallacy: leaving lights on does not prove physical presence.",

  // The raw argument/critique entered by the player in the mediation textarea
  "user_reasoning": "You're assuming he was there just because of the lights. That's a false cause fallacy—anyone could have left them on."
}

const response = {
  // TRUE if player's argument accurately exposes the flaw or valid logic; FALSE if lazy, fabricated, or incorrect
  "is_valid": true,

  // One-sentence feedback explanation from the referee; rendered in the player's status bar
  "feedback": "Valid objection. Leaving the lights on is circumstantial and does not establish physical presence at the freezer."
}