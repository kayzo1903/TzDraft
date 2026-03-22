# Tournament System Docs

| Document | Description |
|---|---|
| [TOURNAMENT_PLAN.md](TOURNAMENT_PLAN.md) | Full plan: vision, data model, backend architecture, frontend layout, phase delivery |
| [TOURNAMENT_PRODUCT_FLOW.md](TOURNAMENT_PRODUCT_FLOW.md) | Current end-to-end product flow from admin setup through participation and management |
| [TOURNAMENT_TEST_PLAN.md](TOURNAMENT_TEST_PLAN.md) | Phase 1 test targets and behavior checks |

## Quick Summary

The current shipped tournament product supports:
- **Scopes:** Global, Country-wide, Regional
- **Eligibility filters:** ELO range, career wins, AI level beaten, AI level played
- **Formats:** Single Elimination today -> Round Robin, Swiss, Double Elimination later
- **Styles:** Blitz, Rapid, Classical, Unlimited
- **Admin operations:** create, edit pre-start, remove participant pre-start, cancel pre-start, manually resolve stuck active matches

Read [TOURNAMENT_PRODUCT_FLOW.md](TOURNAMENT_PRODUCT_FLOW.md) first for the live journey, then [TOURNAMENT_PLAN.md](TOURNAMENT_PLAN.md) for the broader roadmap.
