import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import History from "./History";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";

// Mock matchService to avoid issues
vi.mock("../services/matchService", () => ({
  matchService: {
    updateMatch: vi.fn(),
    deleteMatch: vi.fn(),
  },
}));

// Mock toast to avoid issues
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe("History", () => {
  it("renders matches in a semantic list", () => {
    const matches = [
      {
        id: "1",
        created_at: "2023-01-01T12:00:00Z",
        team1: ["Player A"],
        team2: ["Player B"],
        team1_ids: ["p1"],
        team2_ids: ["p2"],
        team1_sets: 6,
        team2_sets: 4,
        score_type: "sets",
        source_tournament_type: "standalone_1v1"
      },
      {
        id: "2",
        created_at: "2023-01-02T12:00:00Z",
        team1: ["Player C"],
        team2: ["Player D"],
        team1_ids: ["p3"],
        team2_ids: ["p4"],
        team1_sets: 2,
        team2_sets: 6,
        score_type: "sets",
        source_tournament_type: "standalone_1v1"
      },
    ];

    // Minimal mock for profiles
    const profiles = [
      { id: "p1", name: "Player A" },
      { id: "p2", name: "Player B" },
      { id: "p3", name: "Player C" },
      { id: "p4", name: "Player D" },
    ];

    render(
      <QueryClientProvider client={queryClient}>
        <History
          matches={matches as any}
          profiles={profiles as any}
          user={{ id: "u1" }}
        />
      </QueryClientProvider>
    );

    const list = screen.getByRole("list");
    expect(list).toBeInTheDocument();
    expect(list.tagName).toBe("UL");

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0].tagName).toBe("LI");
  });

  it("renders empty state when no matches", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <History
          matches={[]}
          profiles={[]}
          user={{ id: "u1" }}
        />
      </QueryClientProvider>
    );

    expect(screen.getByText("Inga matcher ännu")).toBeInTheDocument();
    expect(screen.getByText("Spela en match och registrera resultatet för att se historik här.")).toBeInTheDocument();
  });
});
