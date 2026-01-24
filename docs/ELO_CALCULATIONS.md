# ELO Calculations in Grabbarnas Serie

This document explains how ELO ratings are calculated for matches in the application.

## Core Concepts

The system uses a modified ELO algorithm tailored for 2v2 Padel matches with several weighting factors to ensure fairness and accurate progression.

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
`Multiplier = 1 + min(0.2, (Sets Difference) * 0.1)`

*Example:*
* A 1-set difference (e.g., 2-1) results in a **1.1x** multiplier.
* A 2-set or greater difference (e.g., 2-0 or 6-0) results in a **1.2x** multiplier (maximum).

### 5. Individual Player Weight
Within a team, players gain or lose ELO differently based on their individual rating relative to the team's average. This helps "pull" players toward their true skill level faster when playing with partners of different skill levels.

**Formula:**
`Weight = 1 + (Team Avg ELO - Player ELO) / 800` (Clamped between 0.75 and 1.25)

* **Lower-rated players** in a high-rated team have a weight > 1.0 (they gain more ELO on win, lose less on loss).
* **Higher-rated players** in a low-rated team have a weight < 1.0 (they gain less ELO on win, lose more on loss).

---

## The Calculation Process

For each match:
1. Calculate the **Average ELO** for both teams.
2. Determine the **Expected Score** for Team 1.
3. Determine the **Margin Multiplier** based on the scoreline.
4. For each player:
   - Identify their **K-Factor** based on games played.
   - Calculate their **Individual Weight** based on team average.
   - **ELO Change (Delta)** = `round(K * Multiplier * Weight * (Actual Result - Expected Score))`
     - *Actual Result is 1 for a win, 0 for a loss.*

---

## Examples

### Example 1: New Players, Even Match
Two teams of new players (0 games, 1000 ELO) play a 2-0 match.
- **Expected Score:** 0.5
- **K-Factor:** 40
- **Margin Multiplier:** 1.2 (for 2-0)
- **Individual Weight:** 1.0
- **Team 1 Delta:** `round(40 * 1.2 * 1.0 * (1 - 0.5))` = `+24`
- **Team 2 Delta:** `round(40 * 1.2 * 1.0 * (0 - 0.5))` = `-24`

### Example 2: Experienced Players, Mismatched Ratings
Team A (Avg 1200) vs Team B (Avg 1000). Both players have 50+ games. Match ends 2-0.
- **Expected Score (Team A):** `1 / (1 + 10^((1000-1200)/300))` ≈ **0.82**
- **K-Factor:** 20
- **Margin Multiplier:** 1.2
- **Team A Delta:** `round(20 * 1.2 * 1.0 * (1 - 0.82))` = `round(24 * 0.18)` = **+4**
- **Team B Delta:** `round(20 * 1.2 * 1.0 * (0 - 0.18))` = `round(24 * -0.18)` = **-4**
*(If Team B had won, the gain would be `round(24 * (1 - 0.18))` = **+20**)*

### Example 3: Mixed Team Ratings
Team 1: Player A (1200 ELO) & Player B (800 ELO) -> Avg 1000.
Team 2: Player C (1000 ELO) & Player D (1000 ELO) -> Avg 1000.
Match ends 2-0 for Team 1. Players have 30+ games.
- **Expected Score:** 0.5
- **Margin Multiplier:** 1.2
- **Player A Weight:** `1 + (1000 - 1200) / 800` = **0.75**
- **Player B Weight:** `1 + (1000 - 800) / 800` = **1.25**
- **Player A Delta:** `round(20 * 1.2 * 0.75 * (1 - 0.5))` = `round(18 * 0.5)` = **+9**
- **Player B Delta:** `round(20 * 1.2 * 1.25 * (1 - 0.5))` = `round(30 * 0.5)` = **+15**
