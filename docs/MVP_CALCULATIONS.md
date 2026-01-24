# MVP Calculations in Grabbarnas Serie

This document explains how the "Most Valuable Player" (MVP) is determined for both the evening and the monthly periods.

## MVP Modes

The application tracks two types of MVP titles:

### 1. Kvällens MVP (Evening MVP)
- **Timeframe:** Includes only matches played on the **most recent date** found in the match history.
- **Eligibility:** A player must have played at least **3 matches** during the evening.
- **Purpose:** Highlights the top performer of the latest padel session.

### 2. Månadens MVP (Month MVP)
- **Timeframe:** Includes all matches played within the **last 30 days** relative to the latest match recorded in the system.
- **Eligibility:** A player must have played at least **6 matches** during the 30-day period.
- **Purpose:** Recognizes consistency, high performance, and high participation over a rolling 30-day window.

## The Scoring Formula

The MVP score is designed to reward high ELO gains while also accounting for win efficiency and participation volume.

**`MVP Score = eloGain × (0.9 + 0.2 × winRate) + 0.3 × gamesPlayed`**

### Breakdown of components:
1.  **eloGain:** The total ELO points gained (or lost) by the player during the specific period (evening or month).
2.  **winRate:** The percentage of matches won during the period (expressed as a decimal between 0 and 1). This factor slightly amplifies the ELO gain.
3.  **gamesPlayed:** The total number of matches played during the period. Every match contributes a flat 0.3 points to the score.

---

## Tie-Breaking Logic
If two or more players have the same MVP Score, the following tie-breakers are applied in order:
1.  **Higher eloGain:** The player who gained more ELO during the period.
2.  **Higher eloNet:** The player with the higher total current ELO rating.
3.  **More wins:** The player with the higher number of wins in the period.
4.  **Sorting:** Internal alphabetical/ID sorting.

---

## Eligibility & Rules
- **Minimum Games:** If no player meets the minimum game requirement (3 for Evening, 6 for Month), the system will display "inte tillräckligt många spelade matcher".
- **Approved Players Only:** Only players with an approved profile are eligible for the MVP title.
- **Exclusion of Guests:** "Gäst" (Guest) players are excluded from winning MVP titles.

---

## Calculation Examples

### Example 1: High Gain vs. High Efficiency
Evening MVP (Min 3 games).
- **Player A:** +30 ELO, 3 wins, 3 games (WinRate: 1.0)
- **Player B:** +35 ELO, 3 wins, 4 games (WinRate: 0.75)

**Player A Score:** `30 * (0.9 + 0.2 * 1.0) + 0.3 * 3` = `30 * 1.1 + 0.9` = **33.9**
**Player B Score:** `35 * (0.9 + 0.2 * 0.75) + 0.3 * 4` = `35 * 1.05 + 1.2` = **37.95**

**Result:** **Player B** wins due to higher ELO gain and participation, despite a lower win percentage.

### Example 2: Tie-Breaker Scenario
Evening MVP (Min 3 games). Both players gain 20 ELO and play 4 matches (WinRate 0.75).
- **Player C:** Current Total ELO: 1250
- **Player D:** Current Total ELO: 1100

**Scores:** Both players have the same MVP Score.
**Tie-breaker:** Player C wins due to higher **eloNet** (Total ELO).
