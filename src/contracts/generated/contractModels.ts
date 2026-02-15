/* eslint-disable */
// AUTO-GENERATED FILE. Do not edit manually.
// Note for non-coders: this file is generated from one shared contract file so web + iOS use the same data shape.
export const CONTRACT_SCHEMA_HASH = "952165fb97272110d3a992e381312242f5753a2cd567f12b06c00bca0e67322e";

export type ContractMatchMode = "1v1" | "2v2";
export type ContractAvailabilitySlot = "morning" | "day" | "evening";

export interface ContractAuthPasswordRequest {
  email: string;
  password: string;
}

export interface ContractAuthRefreshRequest {
  refresh_token: string;
}

export interface ContractAuthSessionResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: {
    id: string;
    email?: string | null;
  };
}

export interface ContractScheduleVoteRequest {
  poll_day_id: string;
  profile_id: string;
  slot_preferences: ContractAvailabilitySlot[];
}

export interface ContractScheduleVoteResponse extends ContractScheduleVoteRequest {
  id: string;
  created_at: string;
}

export interface ContractMatchCreateRequest {
  team1: string[];
  team2: string[];
  team1_ids?: (string | null)[];
  team2_ids?: (string | null)[];
  team1_sets: number;
  team2_sets: number;
  created_by: string;
  source_tournament_id?: string | null;
  match_mode: ContractMatchMode;
}
