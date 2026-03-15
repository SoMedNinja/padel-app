import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll } from "vitest";
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

// Mock useNavigate
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Mock @tanstack/react-virtual
vi.mock("@tanstack/react-virtual", () => {
  const virtualizerMock = ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }).map((_, i) => ({
        index: i,
        start: i * 100,
        size: 100,
        key: i,
        measureElement: vi.fn(),
      })),
    getTotalSize: () => count * 100,
    measureElement: vi.fn(),
  });

  return {
    useVirtualizer: virtualizerMock,
    useWindowVirtualizer: virtualizerMock,
  };
});

// Mock IntersectionObserver & ResizeObserver
beforeAll(() => {
  global.IntersectionObserver = class IntersectionObserver {
    constructor(_callback: any, _options: any) {}
    observe() { return null; }
    unobserve() { return null; }
    disconnect() { return null; }
  } as any;

  global.ResizeObserver = class ResizeObserver {
    constructor(_callback: any) {}
    observe() { return null; }
    unobserve() { return null; }
    disconnect() { return null; }
  } as any;
});

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
    expect(screen.getByText(/Inga matcher hittades för detta filter/i)).toBeInTheDocument();
  });



  it("does not open details when choosing edit from the action menu", () => {
    const onOpenDetails = vi.fn();
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
        source_tournament_type: "standalone_1v1",
      },
    ];

    const profiles = [
      { id: "p1", name: "Player A" },
      { id: "p2", name: "Player B" },
    ];

    render(
      <QueryClientProvider client={queryClient}>
        <History
          matches={matches as any}
          profiles={profiles as any}
          user={{ id: "admin-1", is_admin: true }}
          onOpenDetails={onOpenDetails}
        />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByLabelText("Visa matchåtgärder"));
    fireEvent.click(screen.getByText("Ändra"));

    expect(onOpenDetails).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Välj datum och tid för matchen")).toBeInTheDocument();
  });

  it("triggers action on Enter key for accessibility", () => {
    const onOpenDetails = vi.fn();
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
    ];

    const profiles = [
      { id: "p1", name: "Player A" },
      { id: "p2", name: "Player B" },
    ];

    render(
      <QueryClientProvider client={queryClient}>
        <History
          matches={matches as any}
          profiles={profiles as any}
          user={{ id: "u1" }}
          onOpenDetails={onOpenDetails}
        />
      </QueryClientProvider>
    );

    // Find the card by role button (added for a11y)
    const cardButtons = screen.getAllByRole("button");
    // Filter to find the card, ignoring the menu button
    const card = cardButtons.find(b => b.getAttribute("id") === "match-1");

    expect(card).toBeInTheDocument();

    if (card) {
        fireEvent.keyDown(card, { key: "Enter", code: "Enter" });
        expect(onOpenDetails).toHaveBeenCalledWith("1");
    }
  });
});
