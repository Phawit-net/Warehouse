import { describe, expect, it, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PrimaryButton from "../PrimaryButton";

test("renders PrimaryButton with correct text", () => {
  render(<PrimaryButton text="Submit" handleClick={() => {}} />);
  const button = screen.getByRole("button", { name: /submit/i });
  expect(button).toBeInTheDocument();
});

test("calls handleClick when clicked", () => {
  const handleClick = vi.fn();
  render(<PrimaryButton text="Click Me" handleClick={handleClick} />);
  const button = screen.getByRole("button", { name: /click me/i });
  fireEvent.click(button);
  expect(handleClick).toHaveBeenCalledTimes(1);
});
