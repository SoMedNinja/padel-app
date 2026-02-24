import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom"; // Import custom matchers
import Avatar from "./Avatar";

describe("Avatar", () => {
  it("renders with a descriptive alt text when name is provided (image mode)", () => {
    render(<Avatar name="Kalle" src="kalle.jpg" />);
    // In image mode, wrapper should NOT have role="img".
    // The image itself should be the only accessible image.
    const imgs = screen.getAllByRole("img");
    expect(imgs).toHaveLength(1);
    expect(imgs[0]).toHaveAttribute("alt", "Avatar för Kalle");
  });

  it("renders with descriptive label when no image src is provided (text mode)", () => {
    render(<Avatar name="Kalle" />);
    // No src, so no img tag. But parent div has role="img" and aria-label.
    const avatar = screen.getByRole("img", { name: "Avatar för Kalle" });
    expect(avatar).toBeInTheDocument();
    // It should contain the initial "K"
    expect(avatar).toHaveTextContent("K");
  });

  it("renders with generic label when no name or alt is provided", () => {
    render(<Avatar src="anon.jpg" />);
    const imgs = screen.getAllByRole("img");
    // Should verify only one image (the img tag)
    expect(imgs).toHaveLength(1);
    expect(imgs[0]).toHaveAttribute("alt", "Avatar");
  });

  it("renders as decorative (presentation) when alt is empty", () => {
    const { container } = render(<Avatar name="Kalle" src="kalle.jpg" alt="" />);
    // Wrapper should have role="presentation"
    // Img should have alt="" (which implies role="presentation" or "none")

    // Check wrapper
    // MuiAvatar root usually has class MuiAvatar-root
    const wrapper = container.querySelector(".MuiAvatar-root");
    expect(wrapper).toHaveAttribute("role", "presentation");

    // Check img
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("alt", "");
  });

  it("renders with explicit custom alt text if provided", () => {
    render(<Avatar name="Kalle" src="kalle.jpg" alt="Custom Alt" />);
    const imgs = screen.getAllByRole("img");
    expect(imgs).toHaveLength(1);
    expect(imgs[0]).toHaveAttribute("alt", "Custom Alt");
  });
});
