# ELO Calculations in Grabbarnas Serie

This document explains how ELO ratings are calculated for matches in the application.

> **Note for non-coders:** ELO is the number next to a player's name. It goes up when you win and down when you lose. The app uses a few extra multipliers so short matches count less and big wins count a bit more.

## Core Concepts

The system uses a modified ELO algorithm tailored for 2v2 padel matches with several weighting factors to ensure fairness and accurate progression.

### 1. Baseline Rating
All new players start with an initial ELO of **1000**.

### 2. K-Factor (Volatility)
The K-factor determines how much a player's rating can change after a single match. It decreases as a player gains more experience to stabilize their rating over time.

| Matches Played | K-Factor |
| :--- | :--- |
| < 10 | 40 (High volatility for new players) |
| 10 - 29 | 30 |
| ≥ 30 | 20 (Stable rating) |

### 3. Expected Score
The expected score (win probability) is calculated based on the difference between the average ELO of Team 1 and Team 2.

**Formula:**
`Expected Score = 1 / (1 + 10^((Opponent Team Avg ELO - Own Team Avg ELO) / 300))`

*Note: The divisor used is 300 (standard ELO uses 400), which makes the system slightly more sensitive to rating differences.*

### 4. Margin Multiplier
Matches won by a larger margin of sets result in a slightly higher ELO change.

**Formula:**
`Multiplier = 1 + (Margin * 0.1)`
*   **Margin 1:** 1 or 2 set difference (e.g., 2-1, 2-0, 8-6).
*   **Margin 2:** 3 or more set difference (e.g., 6-3, 6-0).

*Example:*
* A 1 or 2 set difference (e.g., 2-1, 2-0, 8-6) results in a **1.1x** multiplier.
* A 3-set or greater difference (e.g., 6-3 or 6-0) results in a **1.2x** multiplier (maximum).

### 5. Match Length Weight
Shorter matches count for half the ELO change, while long/tournament matches count fully.

* **Tournament matches:** Weight **1.0**.
* **Set scoring:** If the winning team reaches **3 sets or fewer**, weight **0.5**. If it reaches **6 sets or more**, weight **1.0**. Anything in between stays at **0.5**.
* **Point scoring:** If the target is **15 or 21 points**, weight **0.5**. If the target is **higher than 21**, weight **1.0**.

> **Note for non-coders:** This is how the app makes short games less impactful than long matches.

### 6. Singles Match Weight
1v1 matches count for half the ELO change, as one player's individual form has a much larger impact on the result than in 2v2 matches.

* **Singles matches:** Weight **0.5**.
* **Doubles matches:** Weight **1.0**.

> **Note for non-coders:** This prevents ratings from swinging too wildly based on a single 1v1 performance.

### 7. Individual Player Weight
Within a team, players gain or lose ELO differently based on their individual rating relative to the team's average. This helps "pull" players toward their true skill level faster when playing with partners of different skill levels.

**Formula:**
`Weight = 1 + (Team Avg ELO - Player ELO) / 800` (Clamped between 0.75 and 1.25)

**How it's applied:**
* **Wins:** use `Weight` directly (lower-rated players gain more, higher-rated players gain less).
* **Losses:** use the inverse `1 / Weight` (higher-rated players lose more, lower-rated players lose less).

> **Note for non-coders:** This is how the app protects newer/lower-rated players from big drops while still holding higher-rated partners more accountable for losses.

### 8. Match Eligibility
Matches only affect ELO when:
* Both teams include real (non-guest) players.
* The match has valid set scores.

> **Note for non-coders:** If a match is missing scores or only has a guest, it won't move anyone's rating.

---

## The Calculation Process

For each match (sorted by date):
1. Calculate the **Average ELO** for both teams.
2. Determine the **Expected Score** for Team 1.
3. Determine the **Margin Multiplier** based on the scoreline.
4. Determine the **Match Length Weight** based on format and target.
5. Determine the **Singles Weight** (0.5x if 1v1, 1.0x otherwise).
6. For each player:
   - Identify their **K-Factor** based on games played.
   - Calculate their **Individual Weight** based on team average.
   - **ELO Change (Delta)** = `round(K * MarginMultiplier * MatchWeight * SinglesWeight * EffectiveWeight * (Actual Result - Expected Score))`
     - *Actual Result is 1 for a win, 0 for a loss.*
     - *EffectiveWeight = PlayerWeight on wins, or (1 / PlayerWeight) on losses.*

> **Note for non-coders:** The app rounds the final change to a whole number so the ELO stays easy to read.

---

## ELO History Chart Note
The ELO history chart in the player profile uses the same base formula but does **not** apply the match length weight, so the line can differ slightly from the current ELO total.

---

## Examples

### Example 1: New Players, Even Match (Short Match)
Two teams of new players (0 games, 1000 ELO) play a 2-0 match.
- **Expected Score:** 0.5
- **K-Factor:** 40
- **Margin Multiplier:** 1.1 (for 2-0)
- **Match Weight:** 0.5 (short match)
- **Individual Weight:** 1.0
- **Team 1 Delta:** `round(40 * 1.1 * 0.5 * 1.0 * (1 - 0.5))` = `+11`
- **Team 2 Delta:** `round(40 * 1.1 * 0.5 * 1.0 * (0 - 0.5))` = `-11`

### Example 2: Experienced Players, Mismatched Ratings (Short Match)
Team A (Avg 1200) vs Team B (Avg 1000). Both players have 50+ games. Match ends 2-0.
- **Expected Score (Team A):** `1 / (1 + 10^((1000-1200)/300))` ≈ **0.82**
- **K-Factor:** 20
- **Margin Multiplier:** 1.1
- **Match Weight:** 0.5
- **Team A Delta:** `round(20 * 1.1 * 0.5 * 1.0 * (1 - 0.82))` = `round(11 * 0.18)` = **+2**
- **Team B Delta:** `round(20 * 1.1 * 0.5 * 1.0 * (0 - 0.18))` = `round(11 * -0.18)` = **-2**
*(If Team B had won, the gain would be `round(11 * (1 - 0.18))` = **+9**)*

### Example 3: Mixed Team Ratings (Short Match)
Team 1: Player A (1200 ELO) & Player B (800 ELO) -> Avg 1000.
Team 2: Player C (1000 ELO) & Player D (1000 ELO) -> Avg 1000.
Match ends 2-0 for Team 1. Players have 30+ games.
- **Expected Score:** 0.5
- **Margin Multiplier:** 1.1
- **Match Weight:** 0.5
- **Player A Weight:** `1 + (1000 - 1200) / 800` = **0.75**
- **Player B Weight:** `1 + (1000 - 800) / 800` = **1.25**
- **Player A Delta:** `round(20 * 1.1 * 0.5 * 0.75 * (1 - 0.5))` = `round(8.25 * 0.5)` = **+4**
- **Player B Delta:** `round(20 * 1.1 * 0.5 * 1.25 * (1 - 0.5))` = `round(13.75 * 0.5)` = **+7**
*(If Team 1 lost instead, Player A would lose more than Player B because the loss uses inverse weights.)*

---

## Input Summary Table

| Input name | Small description | Reason for inclusion | Weight / impact |
| :--- | :--- | :--- | :--- |
| Baseline ELO | Starting rating for new players. | Gives everyone the same starting point. | Fixed at **1000**. |
| Games played | Number of matches played so far. | Sets rating volatility for newer vs. experienced players. | **K = 40 / 30 / 20** based on games. |
| Team average ELO | Average rating of each team. | Used to calculate expected win probability. | Divisor **300** in expected-score formula. |
| Match result | Win (1) or loss (0). | Drives whether ELO goes up or down. | Multiplies `(Actual - Expected)`. |
| Set difference | Absolute set gap between teams. | Rewards more decisive wins. | **1.0–1.2x** margin multiplier (1-2 sets: 1.1x, 3+ sets: 1.2x). |
| Match length / format | Sets or points target (or tournament flag). | Scales short vs. long match impact. | **0.5x** for short, **1.0x** for long/tournament. |
| Singles match | Whether the match is 1v1 or 2v2. | Reduces volatility for singles matches. | **0.5x** for singles, **1.0x** for doubles. |
| Player vs. team ELO | Player rating compared to team average. | Adjusts gains for mismatched partners. | **Wins:** 0.75–1.25x weight, **Losses:** inverse weight. |
| Rounding | Final rounding to whole numbers. | Keeps ELO values readable. | `round(...)` on the final delta. |
