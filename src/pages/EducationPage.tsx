import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  DirectionsRun as DirectionsRunIcon,
  Flag as FlagIcon,
  Gavel as GavelIcon,
  North as NorthIcon,
  Shield as ShieldIcon,
  Shuffle as ShuffleIcon,
  SportsTennis as SportsTennisIcon,
} from "@mui/icons-material";
import { useStore } from "../store/useStore";
import { educationTopics, type EducationTopic } from "../content/educationTopics";

interface CompletedQuizRecord {
  topicId: string;
  badgeId: string;
  badgeLabel: string;
  badgeIcon: string;
  answeredAt: string;
  correctCount: number;
  passed: boolean;
  answers: Record<string, string>;
}

const illustrationIcons = {
  sports_tennis: SportsTennisIcon,
  shuffle: ShuffleIcon,
  flag: FlagIcon,
  directions_run: DirectionsRunIcon,
  gavel: GavelIcon,
  north: NorthIcon,
  shield: ShieldIcon,
} as const;

function storageKeyForUser(userId: string | null | undefined) {
  return `education-quiz-completion-v1:${userId ?? "guest"}`;
}

function TopicListView({ completedByTopicId }: { completedByTopicId: Record<string, CompletedQuizRecord> }) {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
        Utbildning
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Lär dig padel med korta artiklar och quiz som kan göras en gång per ämne.
      </Typography>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <List disablePadding>
            {educationTopics.map((topic, index) => {
              const Icon = illustrationIcons[topic.illustration];
              const earnedBadge = completedByTopicId[topic.id];

              return (
                <Box key={topic.id}>
                  <ListItemButton onClick={() => navigate(`/education/${topic.id}`)} sx={{ py: 1.5 }}>
                    <ListItemIcon>
                      <Icon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={topic.title}
                      secondary={topic.summary}
                      primaryTypographyProps={{ fontWeight: 700 }}
                    />
                    {earnedBadge ? (
                      earnedBadge.passed ? <CheckCircleIcon color="success" sx={{ mr: 1 }} /> : <CancelIcon color="error" sx={{ mr: 1 }} />
                    ) : null}
                    {earnedBadge ? (
                      <Chip size="small" color="success" label={`${earnedBadge.badgeIcon} ${earnedBadge.badgeLabel}`} sx={{ mr: 1 }} />
                    ) : null}
                    <ArrowForwardIcon color="action" />
                  </ListItemButton>
                  {index < educationTopics.length - 1 && <Divider component="li" />}
                </Box>
              );
            })}
          </List>
        </CardContent>
      </Card>
    </Container>
  );
}

function TopicArticleView({
  topic,
  completion,
  onComplete,
}: {
  topic: EducationTopic;
  completion?: CompletedQuizRecord;
  onComplete: (record: CompletedQuizRecord) => void;
}) {
  const navigate = useNavigate();
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>(completion?.answers ?? {});

  const isCompleted = Boolean(completion);

  const correctCount = useMemo(
    () => topic.quiz.filter((question) => selectedAnswers[question.id] === question.correctAnswer).length,
    [selectedAnswers, topic.quiz],
  );

  const passed = isCompleted ? completion.passed : correctCount === topic.quiz.length;
  const allAnswered = topic.quiz.every((question) => Boolean(selectedAnswers[question.id]));

  useEffect(() => {
    setSelectedAnswers(completion?.answers ?? {});
  }, [completion]);

  const Icon = illustrationIcons[topic.illustration];

  const handleCompleteQuiz = () => {
    if (isCompleted || !allAnswered) return;

    // Note for non-coders: once this record is saved, the quiz is locked and cannot be redone.
    onComplete({
      topicId: topic.id,
      badgeId: topic.badgeId,
      badgeLabel: topic.badgeLabel,
      badgeIcon: topic.badgeIcon,
      answeredAt: new Date().toISOString(),
      correctCount,
      passed: correctCount === topic.quiz.length,
      answers: selectedAnswers,
    });
  };

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Button variant="text" onClick={() => navigate("/education")}>Till ämneslistan</Button>
        <Chip label={`${correctCount}/${topic.quiz.length} rätt`} color={passed ? "success" : "primary"} variant="outlined" />
      </Stack>

      <Card sx={{ borderRadius: 3, mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Icon color="primary" />
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{topic.title}</Typography>
          </Stack>

          <Box
            sx={{
              mt: 2,
              mb: 2,
              p: 2,
              borderRadius: 2,
              bgcolor: "primary.50",
              border: "1px solid",
              borderColor: "primary.100",
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Illustration</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Icon color="primary" />
              <ArrowForwardIcon color="action" />
              <CheckCircleIcon color="success" />
              <Typography color="text.secondary">Läs, visualisera, gör quizet och lås din badge.</Typography>
            </Stack>
          </Box>

          <Stack spacing={1.5}>
            {topic.article.map((paragraph) => (
              <Typography key={paragraph} color="text.secondary">{paragraph}</Typography>
            ))}

            {topic.articleIllustrations.map((illustration) => (
              <Box key={illustration.src} sx={{ mt: 1 }}>
                <Box
                  component="img"
                  src={illustration.src}
                  alt={illustration.alt}
                  sx={{
                    width: "100%",
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                  {illustration.caption}
                </Typography>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Quiz (en gång)</Typography>

          {isCompleted ? (
            <Alert severity={completion.passed ? "success" : "error"} sx={{ mb: 2 }}>
              {completion.passed ? "✅ Du klarade quizet!" : "❌ Quizet blev inte godkänt den här gången."} Resultat: {completion.correctCount}/{topic.quiz.length}.
            </Alert>
          ) : null}

          <Stack spacing={2}>
            {topic.quiz.map((question, index) => (
              <Box key={question.id}>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>{index + 1}. {question.question}</Typography>
                <ToggleButtonGroup
                  exclusive
                  value={selectedAnswers[question.id] ?? null}
                  onChange={(_, value) => {
                    if (!isCompleted && value) {
                      setSelectedAnswers((previous) => ({ ...previous, [question.id]: value }));
                    }
                  }}
                  orientation="vertical"
                  fullWidth
                >
                  {question.options.map((option) => {
                    const isSelected = selectedAnswers[question.id] === option;
                    const isCorrect = option === question.correctAnswer;

                    return (
                      <ToggleButton
                        key={option}
                        value={option}
                        disabled={isCompleted}
                        sx={{ justifyContent: "flex-start", textTransform: "none" }}
                      >
                        {option}
                        {isSelected && isCorrect && <CheckCircleIcon color="success" sx={{ ml: 1 }} />}
                      </ToggleButton>
                    );
                  })}
                </ToggleButtonGroup>
              </Box>
            ))}
          </Stack>

          {!isCompleted ? (
            <Button variant="contained" sx={{ mt: 3 }} onClick={handleCompleteQuiz} disabled={!allAnswered}>
              Slutför quiz och lås badge
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </Container>
  );
}

export default function EducationPage() {
  const { topicId } = useParams();
  const { user } = useStore();
  const [completedByTopicId, setCompletedByTopicId] = useState<Record<string, CompletedQuizRecord>>({});

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKeyForUser(user?.id));
    if (!raw) {
      setCompletedByTopicId({});
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, CompletedQuizRecord>;
      // Note for non-coders: older saved quiz results may not have the `passed` field, so we calculate it from score.
      const normalized = Object.fromEntries(
        Object.entries(parsed).map(([key, value]) => [
          key,
          {
            ...value,
            passed: value.passed ?? value.correctCount === educationTopics.find((topic) => topic.id === key)?.quiz.length,
          },
        ]),
      ) as Record<string, CompletedQuizRecord>;
      setCompletedByTopicId(normalized);
    } catch {
      setCompletedByTopicId({});
    }
  }, [user?.id]);

  const saveCompletion = (record: CompletedQuizRecord) => {
    setCompletedByTopicId((previous) => {
      if (previous[record.topicId]) return previous;
      const next = { ...previous, [record.topicId]: record };
      window.localStorage.setItem(storageKeyForUser(user?.id), JSON.stringify(next));
      return next;
    });
  };

  const selectedTopic = educationTopics.find((topic) => topic.id === topicId);

  if (!topicId) {
    return <TopicListView completedByTopicId={completedByTopicId} />;
  }

  if (!selectedTopic) {
    return (
      <Container maxWidth="sm" sx={{ py: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Ämnet hittades inte</Typography>
        <Button variant="contained" href="/education">Gå till Utbildning</Button>
      </Container>
    );
  }

  return (
    <TopicArticleView
      topic={selectedTopic}
      completion={completedByTopicId[selectedTopic.id]}
      onComplete={saveCompletion}
    />
  );
}
