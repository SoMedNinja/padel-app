// Tournament Types
export enum TournamentType {
  STANDALONE = "standalone",
  STANDALONE_1V1 = "standalone_1v1",
  MEXICANO = "mexicano",
  AMERICANO = "americano",
}

// Score Types
export enum ScoreType {
  SETS = "sets",
  POINTS = "points",
}

// Match Outcomes
export enum MatchOutcome {
  WIN = "W",
  LOSS = "L",
  DRAW = "D",
}

// Match Filters
export enum MatchFilterType {
  ALL = "all",
  SHORT = "short",
  LONG = "long",
  TOURNAMENTS = "tournaments",
  LAST7 = "last7",
  LAST30 = "last30",
  RANGE = "range",
}

// Tournament Status
export enum TournamentStatus {
  DRAFT = "draft",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  ABANDONED = "abandoned",
}

// Availability Slots
export enum AvailabilitySlot {
  MORNING = "morning",
  DAY = "day",
  EVENING = "evening",
}

// Availability Status
export enum AvailabilityPollStatus {
  OPEN = "open",
  CLOSED = "closed",
}

// Game Status
export enum GameStatus {
  SCHEDULED = "scheduled",
  CANCELLED = "cancelled",
}
