import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import PlayerGrid from "./PlayerGrid";
import { GUEST_ID, GUEST_NAME } from "../../utils/guest";
import { Profile } from "../../types";

const mockPlayers: Profile[] = [
  { id: "p1", name: "Player One", email: "p1@example.com" },
  { id: "p2", name: "Player Two", email: "p2@example.com" },
  { id: GUEST_ID, name: GUEST_NAME, email: "" } as Profile,
];

describe("PlayerGrid", () => {
  it("renders all players initially", () => {
    const setQuery = vi.fn();
    const onSelect = vi.fn();

    render(
      <PlayerGrid
        selectablePlayers={mockPlayers}
        registeredPlayerCount={2}
        query=""
        setQuery={setQuery}
        onSelect={onSelect}
        selectedIds={[]}
        excludeIds={[]}
      />
    );

    expect(screen.getByText("Player One")).toBeInTheDocument();
    expect(screen.getByText("Player Two")).toBeInTheDocument();
    expect(screen.getByText(GUEST_NAME)).toBeInTheDocument();
  });

  it("hides excluded players (except guest)", () => {
    const setQuery = vi.fn();
    const onSelect = vi.fn();

    // Exclude Player One
    render(
      <PlayerGrid
        selectablePlayers={mockPlayers}
        registeredPlayerCount={2}
        query=""
        setQuery={setQuery}
        onSelect={onSelect}
        selectedIds={[]}
        excludeIds={["p1"]}
      />
    );

    // Player One should be hidden (NOT in the document)
    expect(screen.queryByText("Player One")).not.toBeInTheDocument();

    // Player Two should be visible
    expect(screen.getByText("Player Two")).toBeInTheDocument();

    // Guest should be visible
    expect(screen.getByText(GUEST_NAME)).toBeInTheDocument();
  });

  it("always shows guest even if passed in excludeIds", () => {
    const setQuery = vi.fn();
    const onSelect = vi.fn();

    render(
      <PlayerGrid
        selectablePlayers={mockPlayers}
        registeredPlayerCount={2}
        query=""
        setQuery={setQuery}
        onSelect={onSelect}
        selectedIds={[]}
        excludeIds={[GUEST_ID]}
      />
    );

    expect(screen.getByText(GUEST_NAME)).toBeInTheDocument();
  });
});
