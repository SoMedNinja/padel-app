# MVP Calculations in Grabbarnas Serie

This document explains how the "Most Valuable Player" (MVP) is determined for both the evening and the monthly periods.

## MVP Modes

The application tracks two types of MVP titles:

### 1. Kvällens MVP (Evening MVP)
- **Timeframe:** Includes only matches played on the **most recent date** found in the match history.
- **Purpose:** Highlights the top performer of the latest padel session.

### 2. Månadens MVP (Month MVP)
- **Timeframe:** Includes all matches played within the **last 30 days** relative to the latest match recorded in the system.
- **Purpose:** Recognizes consistency, high performance, and high participation over a rolling 30-day window.

## The Scoring Formula

The MVP is not necessarily the person with the most wins; it is a weighted balance of win volume, efficiency, and participation. Every eligible player receives a "MVP Score" calculated as follows:

**`Score = (Wins × 3) + (Win% × 5) + (Games Played)`**

### Breakdown of components:
1.  **Wins (Weight: 3):** The primary driver. Every win is worth 3 points.
2.  **Win% (Weight: 5):** Rewards efficiency. A 100% win rate adds 5 points, while a 50% win rate adds 2.5 points. (Calculated as `Wins / Games Played`).
3.  **Games Played (Weight: 1):** Rewards participation. Every match played adds 1 point, regardless of the outcome.

---

## Eligibility & Rules
- **Approved Players Only:** Only players with an approved profile are eligible for the MVP title.
- **Exclusion of Guests:** While "Gäst" (Guest) players can participate in matches and affect the ratings of others, they are excluded from winning MVP titles.
- **Tie-Breaking:** If two players have the exact same mathematical score, the first player in the sorted list (based on internal processing order) is selected as the MVP.

---

## Calculation Examples

### Example 1: Participation vs. Perfection
Two players compete on the same evening:
- **Player A:** 4 wins, 4 games (100% win rate)
- **Player B:** 4 wins, 6 games (67% win rate)

| Player | Wins (x3) | Win% (x5) | Games (x1) | Total Score |
| :--- | :--- | :--- | :--- | :--- |
| **Player A** | 12 | 5.00 | 4 | **21.00** |
| **Player B** | 12 | 3.35 | 6 | **21.35** |

**Result:** **Player B** wins MVP. Even though Player A was "perfect," Player B's extra participation provided more value to the session.

### Example 2: Volume Dominance
- **Player C:** 2 wins, 2 games (100% win rate)
- **Player D:** 3 wins, 5 games (60% win rate)

| Player | Wins (x3) | Win% (x5) | Games (x1) | Total Score |
| :--- | :--- | :--- | :--- | :--- |
| **Player C** | 6 | 5.00 | 2 | **13.00** |
| **Player D** | 9 | 3.00 | 5 | **17.00** |

**Result:** **Player D** wins MVP. Higher win volume and participation significantly outweigh the "perfect" but short performance of Player C.

### Example 3: Marginal Differences
- **Player E:** 5 wins, 5 games (100% win rate)
- **Player F:** 5 wins, 7 games (71% win rate)

| Player | Wins (x3) | Win% (x5) | Games (x1) | Total Score |
| :--- | :--- | :--- | :--- | :--- |
| **Player E** | 15 | 5.00 | 5 | **25.00** |
| **Player F** | 15 | 3.55 | 7 | **25.55** |

**Result:** **Player F** wins by a margin of 0.55 points. The extra 2 matches played more than compensated for the two losses.
