import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import BottomNav from "./BottomNav";

// Mock the icons to avoid issues with MUI icons in tests
vi.mock("@mui/icons-material", () => ({
  ShowChart: () => <span data-testid="icon-dashboard" />,
  AccountCircle: () => <span data-testid="icon-profile" />,
  LibraryAdd: () => <span data-testid="icon-match" />,
  CalendarMonth: () => <span data-testid="icon-schedule" />,
  MoreHoriz: () => <span data-testid="icon-more" />,
  Lock: () => <span data-testid="icon-lock" />,
}));

describe("BottomNav", () => {
  it("renders with aria-current='page' on the active link", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <BottomNav
          isMenuOpen={false}
          toggleMenu={vi.fn()}
          closeMenu={vi.fn()}
          isGuest={false}
          canSeeSchedule={true}
          canUseSingleGame={true}
        />
      </MemoryRouter>
    );

    // Dashboard link should be active
    const dashboardLink = screen.getByRole("button", { name: /Översikt/i });
    expect(dashboardLink).toHaveAttribute("aria-current", "page");

    // Profile link should NOT be active
    const profileLink = screen.getByRole("button", { name: /Profil/i });
    expect(profileLink).not.toHaveAttribute("aria-current");
  });

  it("changes active link based on route", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <BottomNav
          isMenuOpen={false}
          toggleMenu={vi.fn()}
          closeMenu={vi.fn()}
          isGuest={false}
          canSeeSchedule={true}
          canUseSingleGame={true}
        />
      </MemoryRouter>
    );

    // Profile link should be active (route is /)
    const profileLink = screen.getByRole("button", { name: /Profil/i });
    expect(profileLink).toHaveAttribute("aria-current", "page");

    // Dashboard link should NOT be active
    const dashboardLink = screen.getByRole("button", { name: /Översikt/i });
    expect(dashboardLink).not.toHaveAttribute("aria-current");
  });
});
