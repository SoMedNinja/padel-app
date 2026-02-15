import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const contractPath = 'contracts/openapi/padel-contract.yaml';
const contract = readFileSync(contractPath, 'utf8');
const hash = createHash('sha256').update(contract).digest('hex');

const tsOutput = `/* eslint-disable */
// AUTO-GENERATED FILE. Do not edit manually.
// Note for non-coders: this file is generated from one shared contract file so web + iOS use the same data shape.
export const CONTRACT_SCHEMA_HASH = "${hash}";

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
`;

const swiftOutput = `// AUTO-GENERATED FILE. Do not edit manually.
// Note for non-coders: this file is generated from one shared contract file so web + iOS use the same data shape.
import Foundation

enum ContractSchema {
    static let hash = "${hash}"
}

enum ContractMatchMode: String, Codable {
    case oneVsOne = "1v1"
    case twoVsTwo = "2v2"
}

enum ContractAvailabilitySlot: String, Codable {
    case morning
    case day
    case evening
}

struct ContractAuthPasswordRequest: Encodable {
    let email: String
    let password: String
}

struct ContractAuthRefreshRequest: Encodable {
    let refreshToken: String

    enum CodingKeys: String, CodingKey {
        case refreshToken = "refresh_token"
    }
}

struct ContractAuthSessionResponse: Decodable {
    let accessToken: String
    let refreshToken: String
    let expiresAt: TimeInterval
    let user: User

    struct User: Decodable {
        let id: UUID
        let email: String?
    }

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case expiresAt = "expires_at"
        case user
    }
}

struct ContractScheduleVoteRequest: Encodable {
    let pollDayId: UUID
    let profileId: UUID
    let slotPreferences: [ContractAvailabilitySlot]

    enum CodingKeys: String, CodingKey {
        case pollDayId = "poll_day_id"
        case profileId = "profile_id"
        case slotPreferences = "slot_preferences"
    }
}

struct ContractMatchCreateRequest: Encodable {
    let team1: [String]
    let team2: [String]
    let team1IDs: [UUID?]?
    let team2IDs: [UUID?]?
    let team1Sets: Int
    let team2Sets: Int
    let createdBy: UUID
    let sourceTournamentId: UUID?
    let matchMode: ContractMatchMode

    enum CodingKeys: String, CodingKey {
        case team1
        case team2
        case team1IDs = "team1_ids"
        case team2IDs = "team2_ids"
        case team1Sets = "team1_sets"
        case team2Sets = "team2_sets"
        case createdBy = "created_by"
        case sourceTournamentId = "source_tournament_id"
        case matchMode = "match_mode"
    }
}
`;

const hashFile = `# AUTO-GENERATED FILE.
${hash}
`;

for (const [path, content] of [
  ['src/contracts/generated/contractModels.ts', tsOutput],
  ['ios-native/PadelNative/Services/Generated/ContractModels.swift', swiftOutput],
  ['contracts/generated/contract-hash.txt', hashFile],
]) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

console.log(`Generated contract models with hash ${hash}`);
