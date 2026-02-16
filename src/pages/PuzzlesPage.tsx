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
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  EmojiEvents as TrophyIcon,
  School as SchoolIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import confetti from "canvas-confetti";
import { useStore } from "../store/useStore";
import { getPuzzlesByDifficulty, padelPuzzles, puzzleDifficulties, type PadelPuzzle } from "../content/padelPuzzles";
import type { PuzzleDifficulty } from "../content/padelPuzzlesEditable";
import PadelCourt from "../Components/PadelCourt";
import PuzzleLeaderboard from "../Components/PuzzleLeaderboard";
import {
  clearPuzzleAnswers,
  readPuzzleAnswerMap,
  savePuzzleAnswerMap,
  type PadelPuzzleAnswerRecord,
} from "../utils/padelPuzzle";
import { puzzleMeritService } from "../services/puzzleMeritService";
import { puzzleScoreService } from "../services/puzzleScoreService";

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
  const [selectedCoordinate, setSelectedCoordinate] = useState<{ x: number; y: number } | null>(null);
  const [submittedRecord, setSubmittedRecord] = useState<PadelPuzzleAnswerRecord | null>(null);
  const [answersByQuestionId, setAnswersByQuestionId] = useState<Record<string, PadelPuzzleAnswerRecord>>({});

  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [currentScore, setCurrentScore] = useState<number>(0);

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
    if (user?.id) {
      puzzleScoreService.getUserScore(user.id).then(setCurrentScore).catch(console.error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!currentPuzzle || hasAnsweredAllPuzzles) return;
    if (searchParams.get("questionId") !== currentPuzzle.questionId) {
      setSearchParams({ questionId: currentPuzzle.questionId }, { replace: true });
    }
  }, [currentPuzzle, hasAnsweredAllPuzzles, searchParams, setSearchParams]);

  useEffect(() => {
    setSelectedAnswer(answerRecord?.selectedAnswer ?? null);
    setSelectedCoordinate(null);
    setSubmittedRecord(null);
  }, [answerRecord?.selectedAnswer, currentPuzzle?.questionId]);

  const totalSolved = solvedPuzzleIds.length;
  const totalPuzzleCount = allPuzzleIds.size;
  const totalCorrect = useMemo(
    () => Object.values(answersByQuestionId).filter((record) => record.isCorrect).length,
    [answersByQuestionId],
  );

  useEffect(() => {
    if (!user?.id || !hasAnsweredAllPuzzles) return;
    puzzleMeritService.claimFirstPerfectPlayer(user.id).catch((error) => {
      console.error("Could not claim first-perfect puzzle merit", error);
    });
  }, [hasAnsweredAllPuzzles, user?.id]);

  const handleDifficultyChange = (_: MouseEvent<HTMLElement>, value: PuzzleDifficulty | null) => {
    if (!value) return;
    setDifficulty(value);
  };

  const handleCheckAnswer = () => {
    if (!currentPuzzle) return;
    if (answerRecord || submittedRecord) return;

    let isCorrect = false;
    let finalAnswer = selectedAnswer ?? "";

    if (currentPuzzle.type === "tap-to-target") {
      if (!selectedCoordinate || !currentPuzzle.targetCoordinate) return;
      const dist = Math.sqrt(
        Math.pow(selectedCoordinate.x - currentPuzzle.targetCoordinate.x, 2) +
        Math.pow(selectedCoordinate.y - currentPuzzle.targetCoordinate.y, 2)
      );
      isCorrect = dist < 0.2;
      finalAnswer = isCorrect ? currentPuzzle.correctAnswer : "Fel position";
    } else {
      if (!selectedAnswer) return;
      isCorrect = selectedAnswer === currentPuzzle.correctAnswer;
    }

    const nextRecord: PadelPuzzleAnswerRecord = {
      questionId: currentPuzzle.questionId,
      difficulty: currentPuzzle.difficulty,
      selectedAnswer: finalAnswer,
      correctAnswer: currentPuzzle.correctAnswer,
      isCorrect,
      answeredAt: new Date().toISOString(),
    };

    // Note for non-coders: once a player has saved an answer for the current question,
    // we lock that specific question view so the same answer can't be edited immediately.
    setSubmittedRecord(nextRecord);

    if (user?.id) {
      if (nextRecord.isCorrect) {
        puzzleScoreService.incrementScore(100).then(() => setCurrentScore((s) => s + 100));
      } else {
        puzzleScoreService.incrementScore(-50).then(() => setCurrentScore((s) => Math.max(0, s - 50)));
      }
    }

    if (nextRecord.isCorrect) {
      void confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#d32f2f", "#ffffff", "#000000"],
      });
      setAnswersByQuestionId((previous) => {
        const next = { ...previous, [currentPuzzle.questionId]: nextRecord };
        // Note for non-coders: we only store correct answers as permanently solved.
        // Wrong answers are temporary attempts and will come back in the queue later.
        savePuzzleAnswerMap(user?.id, next);
        return next;
      });
    }
  };

  const goToNextPuzzle = () => {
    if (!currentPuzzle) return;

    // Note for non-coders: solved means answered correctly at least once.
    // Wrong attempts are not solved and therefore stay in the active queue.
    const pendingPuzzles = puzzles.filter((puzzle) => !answersByQuestionId[puzzle.questionId]?.isCorrect);

    // Note for non-coders: if the current puzzle is still unsolved, we move it to the back
    // by rotating the pending list so the next unsolved puzzle appears first.
    const unsolvedWithoutCurrent = pendingPuzzles.filter((puzzle) => puzzle.questionId !== currentPuzzle.questionId);
    const rotatedPendingQueue = answersByQuestionId[currentPuzzle.questionId]?.isCorrect
      ? pendingPuzzles
      : [...unsolvedWithoutCurrent, currentPuzzle];

    const candidates = rotatedPendingQueue.length > 0 ? rotatedPendingQueue : puzzles;
    const nextPuzzle = candidates[0] ?? puzzles[0];
    setSearchParams({ questionId: nextPuzzle.questionId });
  };

  const resetProgress = () => {
    // Note for non-coders: this button clears only puzzle progress for the current user key.
    // It does not remove matches, profile data, or other app history.
    clearPuzzleAnswers(user?.id);
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
                <Button
                  variant="outlined"
                  startIcon={<TrophyIcon />}
                  onClick={() => setShowLeaderboard(true)}
                >
                  Topplista
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
        <Dialog open={showLeaderboard} onClose={() => setShowLeaderboard(false)} fullWidth maxWidth="sm">
          <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            Topplista
            <IconButton onClick={() => setShowLeaderboard(false)}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            <PuzzleLeaderboard />
          </DialogContent>
        </Dialog>
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
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
              Padel Puzzles
            </Typography>
            <Typography color="text.secondary">
              Välj svårighetsgrad, läs scenariot och välj ett av tre svarsalternativ.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<TrophyIcon />}
            onClick={() => setShowLeaderboard(true)}
            sx={{ flexShrink: 0, ml: 2, whiteSpace: "nowrap" }}
          >
            {currentScore} p
          </Button>
        </Stack>

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

              {currentPuzzle.diagramUrl && currentPuzzle.type !== "tap-to-target" && (
                <Box
                  component="img"
                  src={currentPuzzle.diagramUrl}
                  alt="Scenario diagram"
                  sx={{
                    width: "100%",
                    maxHeight: 300,
                    objectFit: "contain",
                    borderRadius: 2,
                    bgcolor: "background.paper",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                />
              )}

              {currentPuzzle.type === "video" && currentPuzzle.videoUrl && (
                <Box
                  component="video"
                  src={currentPuzzle.videoUrl}
                  controls
                  sx={{
                    width: "100%",
                    borderRadius: 2,
                    bgcolor: "black",
                  }}
                />
              )}

              {currentPuzzle.type === "tap-to-target" && (
                <PadelCourt
                  onTap={(x, y) => setSelectedCoordinate({ x, y })}
                  selectedTap={selectedCoordinate}
                  correctTap={currentPuzzle.targetCoordinate ?? null}
                  showResult={Boolean(answerRecord || submittedRecord)}
                  imageUrl={currentPuzzle.diagramUrl}
                />
              )}

              {currentPuzzle.type !== "tap-to-target" && (
                <ToggleButtonGroup
                  exclusive
                  value={selectedAnswer}
                  onChange={(_, value) => {
                    if (answerRecord || submittedRecord) return;
                    setSelectedAnswer(value);
                  }}
                  orientation="vertical"
                  fullWidth
                >
                  {currentPuzzle.options.map((option) => (
                    <ToggleButton
                      key={option}
                      value={option}
                      disabled={Boolean(answerRecord || submittedRecord)}
                      sx={{ justifyContent: "flex-start", textTransform: "none" }}
                    >
                      {option}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              )}

              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="contained"
                  onClick={handleCheckAnswer}
                  disabled={(!selectedAnswer && !selectedCoordinate) || Boolean(answerRecord || submittedRecord)}
                >
                  Kontrollera svar
                </Button>
                <Button variant="outlined" onClick={goToNextPuzzle}>
                  Nästa puzzle
                </Button>
              </Stack>

              {(answerRecord || submittedRecord) ? (
                <Alert
                  severity={(answerRecord || submittedRecord)?.isCorrect ? "success" : "warning"}
                  icon={(answerRecord || submittedRecord)?.isCorrect ? <CheckCircleIcon /> : undefined}
                >
                  {(answerRecord || submittedRecord)?.isCorrect ? "Rätt beslut!" : "Inte optimalt val den här gången."} Facit: {currentPuzzle.correctAnswer}
                  <br />
                  <strong>Coaching tips:</strong> {currentPuzzle.coachingTip}
                </Alert>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <Dialog open={showLeaderboard} onClose={() => setShowLeaderboard(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Topplista
          <IconButton onClick={() => setShowLeaderboard(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <PuzzleLeaderboard />
        </DialogContent>
      </Dialog>
    </Container>
  );
}
