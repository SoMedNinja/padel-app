import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import RivalryModal from "./RivalryModal";
import { Match, PlayerStats } from "../types";

// Mock dependencies
const mockUser = {
  id: "user1",
  name: "User 1",
  avatar_url: "url1"
};

const mockPlayer: PlayerStats = {
  id: "player1",
  name: "Player 1",
  elo: 1200,
  startElo: 1200,
  wins: 0,
  losses: 0,
  games: 0,
  history: [],
  partners: {},
  avatarUrl: "url2",
  recentResults: []
};

const mockMatches: Match[] = [
  {
    id: "m1",
    team1: ["User 1"],
    team2: ["Player 1"],
    team1_ids: ["user1"],
    team2_ids: ["player1"],
    team1_sets: 2,
    team2_sets: 0,
    created_at: "2023-01-01",
  }
];

describe("RivalryModal", () => {
  it("hides decorative VS text from screen readers", () => {
    render(
      <RivalryModal
        open={true}
        onClose={() => {}}
        currentUser={mockUser}
        selectedPlayer={mockPlayer}
        matches={mockMatches}
      />
    );

    const vsText = screen.getByText("VS");
    expect(vsText.parentElement).toHaveAttribute("aria-hidden", "true");
  });
});
