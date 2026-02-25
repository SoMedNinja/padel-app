import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import AppAlert from "./AppAlert";

describe("AppAlert", () => {
  it("renders non-interactive alert by default", () => {
    render(<AppAlert>Message</AppAlert>);
    // Check it does NOT have button role.
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders as button when onClick is provided", () => {
    const handleClick = vi.fn();
    render(<AppAlert onClick={handleClick}>Clickable</AppAlert>);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("tabindex", "0");

    // Click works
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Keyboard works (Enter)
    fireEvent.keyDown(button, { key: "Enter" });
    expect(handleClick).toHaveBeenCalledTimes(2);

    // Keyboard works (Space)
    fireEvent.keyDown(button, { key: " " });
    expect(handleClick).toHaveBeenCalledTimes(3);
  });
});
