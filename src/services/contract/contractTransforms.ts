import { ContractMatchCreateRequest, ContractMatchMode, ContractScheduleVoteRequest } from "../../contracts/generated/contractModels";

// Note for non-coders: generated contract types describe raw API data, while helpers here hold app-specific business rules.
const ensureModeTeamSize = (mode: ContractMatchMode, team: string[], teamLabel: string) => {
  const expected = mode === "1v1" ? 1 : 2;
  if (team.length !== expected) {
    throw new Error(`${teamLabel} måste ha ${expected} spelare i läget ${mode}.`);
  }
};

export const buildMatchCreateRequest = (
  payload: Omit<ContractMatchCreateRequest, "match_mode" | "team1" | "team2"> & {
    team1: string[] | string;
    team2: string[] | string;
    match_mode?: ContractMatchMode;
  },
): ContractMatchCreateRequest => {
  const team1 = Array.isArray(payload.team1) ? payload.team1 : [payload.team1];
  const team2 = Array.isArray(payload.team2) ? payload.team2 : [payload.team2];
  const matchMode = payload.match_mode ?? (team1.length === 1 && team2.length === 1 ? "1v1" : "2v2");

  ensureModeTeamSize(matchMode, team1, "Lag 1");
  ensureModeTeamSize(matchMode, team2, "Lag 2");

  return {
    ...payload,
    team1,
    team2,
    match_mode: matchMode,
  };
};

export const buildScheduleVoteRequest = (payload: ContractScheduleVoteRequest): ContractScheduleVoteRequest => {
  if (payload.slot_preferences.length === 0) {
    throw new Error("Välj minst en tidslucka.");
  }
  return payload;
};
