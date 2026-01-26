# Padel Elo Workbook Generator

This repo ships a **generator script** instead of a binary `.xlsx` file. This keeps pull requests readable while still letting you build the same workbook locally.

## How to generate the workbook

```bash
python tools/generate_padel_elo_workbook.py --output padel-elo.xlsx
```

You can then open `padel-elo.xlsx` in Excel or Google Sheets.

## What the workbook contains

### Raw Match Data
- Columns A–N are the raw match fields you paste in.
- Columns O–X are calculated fields (scores, expected scores, deltas, and per-player deltas).

**Non-coder note:** The calculated columns are formulas. Excel reads your match rows and does the math for you automatically when you open the file.

### Config
- `K (Elo K-factor)` controls how big rating changes are per match.
- `Starting Elo` sets the baseline rating for everyone.
- `Team Elo aggregation` and `Split method` describe how team ratings and deltas are computed.

**Non-coder note:** You can tweak these cells to change how “strict” the rating system is without touching any formulas.

### Standings
- The player list is derived from `team1_ids` and `team2_ids`.
- Each player’s final rating is `Starting Elo + total deltas`.

**Non-coder note:** This is just a summary table. It adds up all the rating changes from the match log to show the final ratings.

## Why a generator script?

Some Git hosting tools don’t show `.xlsx` diffs and may block PR previews. By keeping the workbook in a script, you can regenerate the same file locally and still review the logic in a normal code diff.
