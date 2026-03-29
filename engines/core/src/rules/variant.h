#ifndef RULES_VARIANT_H
#define RULES_VARIANT_H

struct RuleConfig {
  bool menCaptureBackward;       // TZ: false  |  RU: true
  bool kingsFly;                 // TZ: true   |  RU: true
  bool menPromoteAndContinue;    // TZ: false  |  RU: true
  bool maxCaptureRequired;       // TZ: true   |  RU: true
  bool majorityCaptureMandatory; // TZ: true   |  RU: false
  bool kingLandingFlexible;      // TZ: true   |  RU: true
  bool drawByRepetition;         // both: true
  int  repetitionThreshold;      // TZ: 3      |  RU: 3
};

const RuleConfig TANZANIA = {
  /* menCaptureBackward */       false,
  /* kingsFly */                 true,   // Art. 3.2: flying king — any number of empty squares
  /* menPromoteAndContinue */    false,
  /* maxCaptureRequired */       false,  // Art. 4.9: free choice — no max-capture requirement
  /* majorityCaptureMandatory */ false,  // Art. 4.9: free choice — no majority requirement
  /* kingLandingFlexible */      true,   // Art. 4.3: king lands on any free square beyond captured piece
  /* drawByRepetition */         true,
  /* repetitionThreshold */      3
};

const RuleConfig RUSSIAN = {
  /* menCaptureBackward */       true,
  /* kingsFly */                 true,
  /* menPromoteAndContinue */    true,
  /* maxCaptureRequired */       true,
  /* majorityCaptureMandatory */ false,
  /* kingLandingFlexible */      true,
  /* drawByRepetition */         true,
  /* repetitionThreshold */      3
};

#endif // RULES_VARIANT_H
