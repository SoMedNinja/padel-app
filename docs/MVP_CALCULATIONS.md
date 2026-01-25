# MVP Calculations in Grabbarnas Serie

This document explains how the "Most Valuable Player" (MVP) is determined for both the evening and the monthly periods.

> **Note for non-coders:** MVP is a fun "top performer" label. The app scores each player for a time window and picks the highest score, with tie-breakers if needed.

## MVP Modes

The application tracks two types of MVP titles:

### 1. Kvällens MVP (Evening MVP)
- **Timeframe:** Includes only matches played on the **most recent date** found in the match history (not necessarily today).
- **Eligibility:** A player must have played at least **3 matches** during the evening.
- **Purpose:** Highlights the top performer of the latest padel session.

### 2. Månadens MVP (Month MVP)
- **Timeframe:** Includes all matches played within the **last 30 days** relative to the latest match recorded in the system (rolling cutoff from the latest match timestamp).
- **Eligibility:** A player must have played at least **6 matches** during the 30-day period.
- **Purpose:** Recognizes consistency, high performance, and high participation over a rolling 30-day window.

## The Scoring Formula

The MVP score is designed to reward high ELO gains while also accounting for win efficiency and participation volume.

**`MVP Score = eloGain × (0.9 + 0.2 × winRate) + 0.3 × gamesPlayed`**

### Breakdown of components:
1.  **eloGain:** The total ELO points gained (or lost) by the player during the specific period (evening or month). This is the sum of each match's ELO delta for that player.
2.  **winRate:** The percentage of matches won during the period (expressed as a decimal between 0 and 1). This factor slightly amplifies the ELO gain.
3.  **gamesPlayed:** The total number of matches played during the period. Every match contributes a flat 0.3 points to the score.

> **Note for non-coders:** A big ELO jump matters most, but a strong win rate and playing more matches can help boost the score.

---

## Tie-Breaking Logic
If two or more players have the same MVP Score, the following tie-breakers are applied in order:
1.  **Higher eloGain:** The player who gained more ELO during the period.
2.  **Higher eloNet:** The player with the higher total current ELO rating.
3.  **More wins:** The player with the higher number of wins in the period.
4.  **Sorting:** Alphabetical by name.

---

## Eligibility & Rules
- **Minimum Games:** If no player meets the minimum game requirement (3 for Evening, 6 for Month), the system will display "inte tillräckligt många spelade matcher".
- **Profiles Only:** MVP candidates are drawn from the player list (profiles loaded in the app), which excludes guests.
- **Exclusion of Guests:** "Gäst" (Guest) players are excluded from winning MVP titles.

---

## MVP Day Counters (Profile Stats)
The player profile shows how many times someone has been MVP for:

- **Evening MVPs:** Counted per match date, using the same scoring logic as the MVP card.
- **Monthly MVP days:** For every calendar day from the first match date up to today (or the latest match date, whichever is later), the app looks back **30 days** and computes a rolling MVP winner. Each day a player wins adds **1 day** to their tally.

The rolling MVP winner for these counters uses a **different score** than the MVP cards:

**`Rolling MVP Score = wins × 3 + winRate × 5 + gamesPlayed`**

> **Note for non-coders:** Think of the monthly MVP days as "how many days you would have been MVP if we checked every day."

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

---

## Input Summary Table

| Input name | Small description | Reason for inclusion | Weight / impact |
| :--- | :--- | :--- | :--- |
| eloGain | Sum of ELO deltas for matches in the window. | Rewards players who improve the most. | Multiplied by **0.9 + 0.2 × winRate**. |
| winRate | Wins divided by games in the window. | Slightly boosts strong win efficiency. | Adds **0.2 × winRate** inside the eloGain multiplier. |
| gamesPlayed | Total matches in the window. | Rewards participation volume. | Adds **0.3 per game**. |
| minGames | Required games (3 evening, 6 month). | Ensures MVP is based on enough matches. | Eligibility gate only. |
| time window | Latest match date or last 30 days. | Defines which matches count. | Inclusion gate only. |
| eloNet | Current total ELO. | Tie-breaker when scores match. | Tie-breaker priority #2. |
| wins | Count of wins in the window. | Tie-breaker when needed. | Tie-breaker priority #3. |
| rolling wins | Wins in a rolling 30-day window. | Used for MVP day counters. | **wins × 3** in rolling score. |
| rolling winRate | Wins ÷ games in rolling window. | Balances efficiency for MVP day counters. | **winRate × 5** in rolling score. |
| rolling games | Games in rolling window. | Rewards activity for MVP day counters. | **+1 per game** in rolling score. |
