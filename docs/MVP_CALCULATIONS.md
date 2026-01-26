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

The MVP score is designed to reward high ELO gains while also accounting for win efficiency and participation volume. The formula is additive to ensure that playing more and winning more always provides a positive bonus, regardless of whether the ELO gain was positive or negative.

**`MVP Score = eloGain + (winRate × 15) + (gamesPlayed × 0.5)`**

### Breakdown of components:
1.  **eloGain:** The total ELO points gained (or lost) by the player during the specific period (evening or month). This is the sum of each match's ELO delta for that player.
2.  **winRate:** The percentage of matches won during the period (expressed as a decimal between 0 and 1). A 100% win rate adds **15 points** to the score.
3.  **gamesPlayed:** The total number of matches played during the period. Every match contributes a flat **0.5 points** to the score.

> **Note for non-coders:** Your ELO improvement is the most important part, but winning your games and being active (playing many matches) gives you a solid boost!

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

- **Evening MVPs:** Counted per match date, using the same scoring logic as the Dashboard's Evening MVP card.
- **MVP-dagar (Månad):** This counter shows how many days a player has held the title of "Monthly MVP". For every calendar day since the first recorded match, the app looks back **30 days** and calculates who would have been the Monthly MVP on that specific day using the standard formula.

The rolling MVP winner for these counters uses the **exact same score and eligibility rules** (6 games minimum) as the Dashboard Monthly MVP card.

> **Note for non-coders:** Think of this as a continuous ticker. Every morning the app checks "Who has been the best over the last 30 days?" and the winner gets +1 day on their counter.

---

## Calculation Examples

### Example 1: High Gain vs. High Efficiency
Evening MVP (Min 3 games).
- **Player A:** +30 ELO, 3 wins, 3 games (WinRate: 1.0)
- **Player B:** +35 ELO, 3 wins, 4 games (WinRate: 0.75)

**Player A Score:** `30 + (1.0 * 15) + (3 * 0.5)` = `30 + 15 + 1.5` = **46.5**
**Player B Score:** `35 + (0.75 * 15) + (4 * 0.5)` = `35 + 11.25 + 2.0` = **48.25**

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
| eloGain | Sum of ELO deltas for matches in the window. | Rewards players who improve the most. | Direct contribution to score. |
| winRate | Wins divided by games in the window. | Boosts strong win efficiency. | Adds up to **15 points**. |
| gamesPlayed | Total matches in the window. | Rewards participation volume. | Adds **0.5 points per game**. |
| minGames | Required games (3 evening, 6 month). | Ensures MVP is based on enough matches. | Eligibility gate only. |
| time window | Latest match date or last 30 days. | Defines which matches count. | Inclusion gate only. |
| eloNet | Current total ELO. | Tie-breaker when scores match. | Tie-breaker priority #3. |
| wins | Count of wins in the window. | Tie-breaker when needed. | Tie-breaker priority #4. |
