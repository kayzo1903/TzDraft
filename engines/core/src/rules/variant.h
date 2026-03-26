#ifndef RULES_VARIANT_H
#define RULES_VARIANT_H

struct RuleConfig {
  bool menCaptureBackward;       // TZ: false  |  RU: true
  bool kingsFly;                 // TZ: false  |  RU: true
  bool menPromoteAndContinue;    // TZ: false  |  RU: true
  bool maxCaptureRequired;       // TZ: true   |  RU: true
  bool majorityCaptureMandatory; // TZ: true   |  RU: false
  bool kingLandingFlexible;      // TZ: false  |  RU: true
  bool drawByRepetition;         // both: true
  int  repetitionThreshold;      // TZ: 3      |  RU: 3
};

const RuleConfig TANZANIA = {
  /* menCaptureBackward */       false,
  /* kingsFly */                 false,
  /* menPromoteAndContinue */    false,
  /* maxCaptureRequired */       true,
  /* majorityCaptureMandatory */ true,
  /* kingLandingFlexible */      false,
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
