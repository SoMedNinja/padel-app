import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readCompletedQuizMap, CompletedQuizRecord } from './educationQuiz';

// Mock the education topics so we control quiz length for pass/fail logic
vi.mock('../content/educationTopics', () => ({
  educationTopics: [
    { id: 'topic-1', quiz: [{}, {}, {}] }, // length 3
    { id: 'topic-2', quiz: [{}, {}] },     // length 2
  ],
}));

describe('readCompletedQuizMap', () => {
  const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

  beforeEach(() => {
    getItemSpy.mockClear();
  });

  afterEach(() => {
    // Ensure mocks are reset between tests if needed, though mockClear handles call history
    vi.clearAllMocks();
  });

  it('returns empty object when localStorage returns null', () => {
    getItemSpy.mockReturnValue(null);

    const result = readCompletedQuizMap('user-123');

    expect(result).toEqual({});
    expect(getItemSpy).toHaveBeenCalledWith('education-quiz-completion-v1:user-123');
  });

  it('returns empty object when localStorage contains invalid JSON', () => {
    getItemSpy.mockReturnValue('invalid-json');

    const result = readCompletedQuizMap('user-123');

    expect(result).toEqual({});
  });

  it('returns correctly parsed data when passed property exists', () => {
    const mockData: Record<string, Partial<CompletedQuizRecord>> = {
      'topic-1': {
        topicId: 'topic-1',
        correctCount: 1,
        passed: true, // explicitly true even if score is low (e.g. manually overridden or old logic)
      },
    };
    getItemSpy.mockReturnValue(JSON.stringify(mockData));

    const result = readCompletedQuizMap('user-123');

    expect(result['topic-1'].passed).toBe(true);
    expect(result['topic-1'].correctCount).toBe(1);
  });

  it('backfills passed=true for legacy data when correctCount equals quiz length', () => {
    // topic-1 has 3 questions. Legacy data missing 'passed' but with correctCount 3.
    const mockData: Record<string, Partial<CompletedQuizRecord>> = {
      'topic-1': {
        topicId: 'topic-1',
        correctCount: 3,
        // passed is missing
      },
    };
    getItemSpy.mockReturnValue(JSON.stringify(mockData));

    const result = readCompletedQuizMap('user-123');

    expect(result['topic-1'].passed).toBe(true);
  });

  it('backfills passed=false for legacy data when correctCount is less than quiz length', () => {
    // topic-1 has 3 questions. Legacy data missing 'passed' with correctCount 2.
    const mockData: Record<string, Partial<CompletedQuizRecord>> = {
      'topic-1': {
        topicId: 'topic-1',
        correctCount: 2,
        // passed is missing
      },
    };
    getItemSpy.mockReturnValue(JSON.stringify(mockData));

    const result = readCompletedQuizMap('user-123');

    expect(result['topic-1'].passed).toBe(false);
  });

  it('handles null user ID by using "guest" key suffix', () => {
    getItemSpy.mockReturnValue(null);

    readCompletedQuizMap(null);

    expect(getItemSpy).toHaveBeenCalledWith('education-quiz-completion-v1:guest');
  });

  it('handles undefined user ID by using "guest" key suffix', () => {
    getItemSpy.mockReturnValue(null);

    readCompletedQuizMap(undefined);

    expect(getItemSpy).toHaveBeenCalledWith('education-quiz-completion-v1:guest');
  });
});
