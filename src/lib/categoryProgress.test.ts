import { describe, expect, it } from "vitest";
import { categoryProgress } from "./categoryProgress";

describe("category expense progress", () => {
  it("shows spent categories without a target", () => {
    expect(categoryProgress(250, 0, 1000, 500).percent).toBe(25);
    expect(categoryProgress(250, 0, 0, 500).percent).toBe(50);
  });
  it("uses the configured target when present", () => {
    expect(categoryProgress(250, 500, 1000, 500).percent).toBe(50);
  });
  it("uses the four percentage color levels", () => {
    expect([25, 50, 75, 100].map(amount => categoryProgress(amount, 100, 0, 0).color))
      .toEqual(["budget-safe", "budget-steady", "budget-warning", "budget-danger"]);
  });
});