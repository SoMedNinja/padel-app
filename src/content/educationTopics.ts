import { editableEducationTopics } from "./educationTopicsEditable";

export interface EducationQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface EducationArticleIllustration {
  src: string;
  alt: string;
  caption: string;
}

// Note for non-coders: we only use local image files from /public/education.
// This avoids broken images when external image services change links or block hotlinking.

export interface EducationTopic {
  id: string;
  title: string;
  summary: string;
  illustration: "sports_tennis" | "shuffle" | "flag" | "directions_run" | "gavel" | "north" | "shield";
  badgeId: string;
  badgeLabel: string;
  badgeIcon: string;
  article: string[];
  articleIllustrations: EducationArticleIllustration[];
  quiz: EducationQuizQuestion[];
}

const toQuizQuestion = (topicId: string, questionId: string, question: string, answers: { text: string; isCorrect: boolean }[]) => {
  const correctAnswers = answers.filter((answer) => answer.isCorrect);

  // Note for non-coders: this safety check prevents accidental quiz mistakes in content editing.
  // Every question must have exactly one correct answer.
  if (correctAnswers.length !== 1) {
    throw new Error(`Quiz question ${topicId}/${questionId} must have exactly one answer with isCorrect: true.`);
  }

  return {
    id: questionId,
    question,
    options: answers.map((answer) => answer.text),
    correctAnswer: correctAnswers[0].text,
  };
};

// Note for non-coders: this array is generated from educationTopicsEditable.ts
// so you can edit all quiz answers and text in one beginner-friendly file.
export const educationTopics: EducationTopic[] = editableEducationTopics.map((topic) => ({
  ...topic,
  quiz: topic.quiz.map((question) => toQuizQuestion(topic.id, question.id, question.question, question.answers)),
}));
