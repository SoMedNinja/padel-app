# ELO Scenarios and Simulations

This document lists various ELO change scenarios to illustrate how the system handles different match-ups.

## Scenario 1: Balanced
**Description:** Everyone starts at 1000 ELO. 2-0 Win.
- **Player 1A (1000):** +12 ELO
- **Player 1B (1000):** +12 ELO
- **Player 2A (1000):** -12 ELO
- **Player 2B (1000):** -12 ELO

## Scenario 2: Underdog
**Description:** Team 1 (Avg 800) vs Team 2 (Avg 1200). 2-1 Win for T1.
- **Player 1A (800):** +19 ELO
- **Player 1B (800):** +19 ELO
- **Player 2A (1200):** -19 ELO
- **Player 2B (1200):** -19 ELO

## Scenario 3: Carry (Win)
**Description:** Team 1: P1A(1400) & P1B(600) vs Team 2: Avg 1000. 2-0 Win for T1.
- **Player 1A (1400):** +4 ELO (Carrier gains less)
- **Player 1B (600):** +11 ELO (Lower rated partner gains more)
- **Player 2A (1000):** -7 ELO
- **Player 2B (1000):** -7 ELO

## Scenario 4: Carry (Loss)
**Description:** Team 1: P1A(1400) & P1B(600) vs Team 2: Avg 1000. 0-2 Loss for T1.
- **Player 1A (1400):** -11 ELO (Carrier loses more)
- **Player 1B (600):** -4 ELO (Lower rated partner loses less)
- **Player 2A (1000):** +7 ELO
- **Player 2B (1000):** +7 ELO
