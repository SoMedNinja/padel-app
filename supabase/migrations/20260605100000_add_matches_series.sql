-- Add series column to matches table
ALTER TABLE public.matches ADD COLUMN series text;

-- Backfill existing matches based on their created_at timestamp
UPDATE public.matches
SET series = 'Serie Q' || TO_CHAR(created_at, 'Q') || ' ' || TO_CHAR(created_at, 'YYYY')
WHERE series IS NULL;

-- Add a comment for documentation
COMMENT ON COLUMN public.matches.series IS 'The quarterly series the match belongs to (e.g., "Serie Q1 2026").';
