import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayArrowIcon,
  Refresh as RefreshIcon,
  Star as StarIcon,
  EmojiEvents as TrophyIcon,
} from "@mui/icons-material";
import { questions, calculateLevel, type Level } from "./questions";

type Step = "intro" | "quiz" | "result";

export default function SelfAssessment() {
  const theme = useTheme();
  const [step, setStep] = useState<Step>("intro");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [resultLevel, setResultLevel] = useState<Level | null>(null);

  const handleStart = () => {
    setStep("quiz");
    setCurrentQuestionIndex(0);
    setTotalScore(0);
    setResultLevel(null);
  };

  const handleAnswer = (points: number, isTerminal?: boolean) => {
    const newScore = totalScore + points;
    setTotalScore(newScore);

    if (isTerminal || currentQuestionIndex >= questions.length - 1) {
      finishAssessment(newScore);
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const finishAssessment = (finalScore: number) => {
    const level = calculateLevel(finalScore);
    setResultLevel(level);
    setStep("result");
  };

  const handleRestart = () => {
    setStep("intro");
    setCurrentQuestionIndex(0);
    setTotalScore(0);
    setResultLevel(null);
  };

  // Render Logic
  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex) / questions.length) * 100;

  return (
    <Card
      sx={{
        borderRadius: 3,
        mb: 3,
        background: step === "result"
          ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
          : "background.paper",
        color: step === "result" ? "white" : "inherit",
        transition: "all 0.3s ease",
        boxShadow: step === "result" ? 6 : 1,
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* INTRO VIEW */}
        {step === "intro" && (
          <Stack spacing={2} alignItems="flex-start">
            <Stack direction="row" spacing={1} alignItems="center">
              <TrophyIcon color="primary" fontSize="large" />
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Vilken padelnivå är du?
              </Typography>
            </Stack>
            <Typography color="text.secondary">
              Gör vårt snabba test (8 frågor) för att uppskatta din spelstyrka enligt Playtomic-skalan.
              Få tips på vad du behöver träna på för att nå nästa nivå!
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<PlayArrowIcon />}
              onClick={handleStart}
              sx={{ mt: 2, fontWeight: 700 }}
            >
              Starta testet
            </Button>
          </Stack>
        )}

        {/* QUIZ VIEW */}
        {step === "quiz" && (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700 }}>
                FRÅGA {currentQuestionIndex + 1} AV {questions.length}
              </Typography>
              <Chip label="Självskattning" size="small" color="primary" variant="outlined" />
            </Stack>

            <LinearProgress variant="determinate" value={progress} sx={{ mb: 3, borderRadius: 1, height: 8 }} />

            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
              {currentQuestion.text}
            </Typography>

            <Stack spacing={1.5}>
              {currentQuestion.options.map((option, index) => (
                <Button
                  key={index}
                  variant="outlined"
                  onClick={() => handleAnswer(option.points, option.isTerminal)}
                  sx={{
                    justifyContent: "flex-start",
                    textAlign: "left",
                    py: 1.5,
                    px: 2,
                    borderColor: "divider",
                    color: "text.primary",
                    "&:hover": {
                      borderColor: "primary.main",
                      bgcolor: "primary.50",
                    },
                  }}
                >
                  {option.text}
                </Button>
              ))}
            </Stack>
          </Box>
        )}

        {/* RESULT VIEW */}
        {step === "result" && resultLevel && (
          <Stack spacing={3}>
            <Box sx={{ textAlign: "center", py: 2 }}>
              <Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: 1.5 }}>
                DIN PADELNIVÅ
              </Typography>
              <Typography variant="h2" sx={{ fontWeight: 800, my: 1 }}>
                {resultLevel.id}
              </Typography>
              <Chip
                label={resultLevel.label}
                color="secondary"
                sx={{ fontWeight: 700, px: 1, py: 2, fontSize: "1rem" }}
              />
            </Box>

            <Box sx={{ bgcolor: "rgba(255,255,255,0.1)", p: 2, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Beskrivning
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                {resultLevel.description}
              </Typography>
            </Box>

            <Box sx={{ bgcolor: "background.paper", color: "text.primary", p: 2, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                <StarIcon color="warning" /> För att nå nästa nivå
              </Typography>
              <List disablePadding>
                {resultLevel.improvements.map((item, idx) => (
                  <ListItem key={idx} disableGutters sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CheckCircleIcon color="success" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={item} primaryTypographyProps={{ variant: "body2", fontWeight: 500 }} />
                  </ListItem>
                ))}
              </List>
            </Box>

            <Button
              variant="contained"
              color="secondary"
              startIcon={<RefreshIcon />}
              onClick={handleRestart}
              fullWidth
              sx={{ fontWeight: 700 }}
            >
              Gör om testet
            </Button>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
