import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders children and applies variant classes", () => {
    render(<Button variant="primary">Lock deposit</Button>);
    const button = screen.getByRole("button", { name: /lock deposit/i });
    expect(button).toBeInTheDocument();
    expect(button.className).toContain("bg-forest-700");
  });

  it("respects the disabled state", () => {
    render(<Button disabled>Join agreement</Button>);
    expect(screen.getByRole("button", { name: /join agreement/i })).toBeDisabled();
  });
});
