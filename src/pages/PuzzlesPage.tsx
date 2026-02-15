import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { CheckCircle as CheckCircleIcon, School as SchoolIcon } from "@mui/icons-material";
import { useStore } from "../store/useStore";
import { getPuzzlesByDifficulty, padelPuzzles, puzzleDifficulties, type PadelPuzzle } from "../content/padelPuzzles";
import type { PuzzleDifficulty } from "../content/padelPuzzlesEditable";
import {
  claimFirstPerfectPuzzlePlayer,
  puzzleStorageKeyForUser,
  readPuzzleAnswerMap,
  type PadelPuzzleAnswerRecord,
} from "../utils/padelPuzzle";

const difficultyLabels: Record<PuzzleDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const difficultyDescriptions: Record<PuzzleDifficulty, string> = {
  easy: "Grundläggande beslut i tydliga lägen.",
  medium: "Mer positionsspel och val under tidspress.",
  hard: "Avancerade matchlägen med små marginaler.",
};

// Note for non-coders: this helper reads questionId from the URL (for example ?questionId=188)
// and returns the puzzle if it exists in the selected difficulty group.
function getPuzzleFromQuery(puzzles: PadelPuzzle[], queryQuestionId: string | null) {
  if (!queryQuestionId) return null;
  return puzzles.find((puzzle) => puzzle.questionId === queryQuestionId) ?? null;
}

export default function PuzzlesPage() {
  const { user } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [difficulty, setDifficulty] = useState<PuzzleDifficulty>("easy");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answersByQuestionId, setAnswersByQuestionId] = useState<Record<string, PadelPuzzleAnswerRecord>>({});

  const puzzles = useMemo(() => getPuzzlesByDifficulty(difficulty), [difficulty]);

  // Note for non-coders: this list contains every puzzle ID available in the app.
  // We use it to detect when the player has answered all scenarios.
  const allPuzzleIds = useMemo(() => new Set(padelPuzzles.map((puzzle) => puzzle.questionId)), []);

  const solvedPuzzleIds = useMemo(() => {
    return Object.entries(answersByQuestionId)
      .filter(([questionId, record]) => allPuzzleIds.has(questionId) && record.isCorrect)
      .map(([questionId]) => questionId);
  }, [allPuzzleIds, answersByQuestionId]);

  // Note for non-coders: "klar" now means correct answer, not just any answer.
  // If a scenario was wrong, it stays in the queue until the player gets it right.
  const hasAnsweredAllPuzzles = solvedPuzzleIds.length >= allPuzzleIds.size && allPuzzleIds.size > 0;

  const queryQuestionId = searchParams.get("questionId");

  const currentPuzzle = useMemo(() => {
    const fromQuery = getPuzzleFromQuery(puzzles, queryQuestionId);
    if (fromQuery) return fromQuery;
    return puzzles[0] ?? null;
  }, [puzzles, queryQuestionId]);

  const answerRecord = currentPuzzle ? answersByQuestionId[currentPuzzle.questionId] : undefined;

  useEffect(() => {
    setAnswersByQuestionId(readPuzzleAnswerMap(user?.id));
  }, [user?.id]);

  useEffect(() => {
    if (!currentPuzzle || hasAnsweredAllPuzzles) return;
    if (searchParams.get("questionId") !== currentPuzzle.questionId) {
      setSearchParams({ questionId: currentPuzzle.questionId }, { replace: true });
    }
  }, [currentPuzzle, hasAnsweredAllPuzzles, searchParams, setSearchParams]);

  useEffect(() => {
    setSelectedAnswer(answerRecord?.selectedAnswer ?? null);
  }, [answerRecord?.selectedAnswer, currentPuzzle?.questionId]);

  const totalSolved = solvedPuzzleIds.length;
  const totalPuzzleCount = allPuzzleIds.size;
  const totalCorrect = useMemo(
    () => Object.values(answersByQuestionId).filter((record) => record.isCorrect).length,
    [answersByQuestionId],
  );

  useEffect(() => {
    if (!user?.id || !hasAnsweredAllPuzzles) return;
    claimFirstPerfectPuzzlePlayer(user.id);
  }, [hasAnsweredAllPuzzles, user?.id]);

  const handleDifficultyChange = (_: MouseEvent<HTMLElement>, value: PuzzleDifficulty | null) => {
    if (!value) return;
    setDifficulty(value);
  };

  const handleCheckAnswer = () => {
    if (!currentPuzzle || !selectedAnswer) return;

    const nextRecord: PadelPuzzleAnswerRecord = {
      questionId: currentPuzzle.questionId,
      difficulty: currentPuzzle.difficulty,
      selectedAnswer,
      correctAnswer: currentPuzzle.correctAnswer,
      isCorrect: selectedAnswer === currentPuzzle.correctAnswer,
      answeredAt: new Date().toISOString(),
    };

    setAnswersByQuestionId((previous) => {
      const next = { ...previous, [currentPuzzle.questionId]: nextRecord };
      // Note for non-coders: we save puzzle answers in your browser storage,
      // so your progress remains after refresh without needing a backend database.
      window.localStorage.setItem(puzzleStorageKeyForUser(user?.id), JSON.stringify(next));
      return next;
    });
  };

  const goToNextPuzzle = () => {
    if (!currentPuzzle) return;

    // Note for non-coders: we prioritize unanswered or wrong puzzles first,
    // so players keep getting pending scenarios until all are correct.
    const pendingPuzzles = puzzles.filter((puzzle) => !answersByQuestionId[puzzle.questionId]?.isCorrect);
    const candidates = pendingPuzzles.length > 0 ? pendingPuzzles : puzzles;
    const currentIndex = candidates.findIndex((puzzle) => puzzle.questionId === currentPuzzle.questionId);
    const nextPuzzle = candidates[(currentIndex + 1 + candidates.length) % candidates.length];
    setSearchParams({ questionId: nextPuzzle.questionId });
  };

  const resetProgress = () => {
    // Note for non-coders: this button clears only puzzle progress for the current user key.
    // It does not remove matches, profile data, or other app history.
    window.localStorage.removeItem(puzzleStorageKeyForUser(user?.id));
    setAnswersByQuestionId({});
    setDifficulty("easy");
    setSelectedAnswer(null);
    const firstPuzzle = getPuzzlesByDifficulty("easy")[0];
    if (firstPuzzle) {
      setSearchParams({ questionId: firstPuzzle.questionId });
    }
  };

  if (hasAnsweredAllPuzzles) {
    return (
      <Container maxWidth="sm" sx={{ py: 3 }}>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                Snyggt jobbat! 🎉
              </Typography>
              <Alert severity="success">
                Du har besvarat alla scenarion ({totalSolved}/{totalPuzzleCount}).
              </Alert>
              <Typography color="text.secondary">
                Fler scenarion kommer snart. Vi fyller på med nya matchsituationer i kommande uppdateringar.
              </Typography>
              <Stack direction="row" spacing={1.5}>
                <Button variant="contained" onClick={resetProgress}>
                  Spela om alla scenarion
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (!currentPuzzle) {
    return (
      <Container maxWidth="sm" sx={{ py: 3 }}>
        <Alert severity="warning">Inga padel-pussel hittades ännu.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            Padel Puzzles
          </Typography>
          <Typography color="text.secondary">
            Välj svårighetsgrad, läs scenariot och välj ett av tre svarsalternativ.
          </Typography>
        </Box>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "flex-start", sm: "center" }}>
              <ToggleButtonGroup exclusive value={difficulty} onChange={handleDifficultyChange}>
                {puzzleDifficulties.map((level) => (
                  <ToggleButton key={level} value={level} sx={{ textTransform: "none", px: 2 }}>
                    {difficultyLabels[level]}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <Chip icon={<SchoolIcon />} label={difficultyDescriptions[difficulty]} variant="outlined" />
              <Chip label={`Lösta: ${totalSolved}/${totalPuzzleCount}`} color="primary" variant="outlined" />
              <Chip label={`Rätt: ${totalCorrect}`} color="success" variant="outlined" />
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="overline" color="text.secondary">
                Puzzle #{currentPuzzle.questionId} • {difficultyLabels[currentPuzzle.difficulty]}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {currentPuzzle.title}
              </Typography>
              <Typography color="text.secondary">{currentPuzzle.scenario}</Typography>

              <ToggleButtonGroup
                exclusive
                value={selectedAnswer}
                onChange={(_, value) => setSelectedAnswer(value)}
                orientation="vertical"
                fullWidth
              >
                {currentPuzzle.options.map((option) => (
                  <ToggleButton key={option} value={option} sx={{ justifyContent: "flex-start", textTransform: "none" }}>
                    {option}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>

              <Stack direction="row" spacing={1.5}>
                <Button variant="contained" onClick={handleCheckAnswer} disabled={!selectedAnswer}>
                  Kontrollera svar
                </Button>
                <Button variant="outlined" onClick={goToNextPuzzle}>
                  Nästa puzzle
                </Button>
              </Stack>

              {answerRecord ? (
                <Alert severity={answerRecord.isCorrect ? "success" : "warning"} icon={answerRecord.isCorrect ? <CheckCircleIcon /> : undefined}>
                  {answerRecord.isCorrect ? "Rätt beslut!" : "Inte optimalt val den här gången."} Facit: {currentPuzzle.correctAnswer}
                  <br />
                  <strong>Coaching tips:</strong> {currentPuzzle.coachingTip}
                </Alert>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}
