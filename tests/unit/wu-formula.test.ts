import { describe, it, expect } from "vitest";

// ─── Pure functions extracted for testing ─────────────────────────────────────
// These mirror the logic inside mission-actions.ts

function resistanceMultiplier(level: number): number {
  if (level >= 7) return 4;
  if (level >= 4) return 2;
  return 1;
}

function calculateWU(
  durationMinutes: number,
  resistanceLevel: number,
  recallMultiplier: number
): number {
  return parseFloat(
    (durationMinutes * resistanceMultiplier(resistanceLevel) * recallMultiplier).toFixed(2)
  );
}

function evaluateRecallHeuristic(input: string, taskTitle: string): number {
  const words = input.trim().split(/\s+/).filter(Boolean).length;
  const taskKeywords = taskTitle.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const inputLower = input.toLowerCase();
  const hasOverlap = taskKeywords.some((w) => inputLower.includes(w));
  const isSubstantial = words >= 20;
  const isThorough = words >= 50;

  if (isThorough && hasOverlap)   return 1.0;
  if (isSubstantial && hasOverlap) return 1.0;
  if (isSubstantial || hasOverlap) return 0.75;
  return 0.5;
}

// ─── Resistance multiplier ────────────────────────────────────────────────────
describe("resistanceMultiplier", () => {
  it("returns 1x for resistance 1-3", () => {
    expect(resistanceMultiplier(1)).toBe(1);
    expect(resistanceMultiplier(3)).toBe(1);
  });

  it("returns 2x for resistance 4-6", () => {
    expect(resistanceMultiplier(4)).toBe(2);
    expect(resistanceMultiplier(6)).toBe(2);
  });

  it("returns 4x for resistance 7-10", () => {
    expect(resistanceMultiplier(7)).toBe(4);
    expect(resistanceMultiplier(10)).toBe(4);
  });

  it("boundary — resistance 3 is 1x, resistance 4 is 2x", () => {
    expect(resistanceMultiplier(3)).toBe(1);
    expect(resistanceMultiplier(4)).toBe(2);
  });

  it("boundary — resistance 6 is 2x, resistance 7 is 4x", () => {
    expect(resistanceMultiplier(6)).toBe(2);
    expect(resistanceMultiplier(7)).toBe(4);
  });
});

// ─── WU formula ───────────────────────────────────────────────────────────────
describe("calculateWU", () => {
  it("base case — 10 min, resistance 1, full recall", () => {
    expect(calculateWU(10, 1, 1.0)).toBe(10);
  });

  it("medium resistance — 30 min, resistance 5, full recall", () => {
    expect(calculateWU(30, 5, 1.0)).toBe(60);
  });

  it("high resistance — 60 min, resistance 9, full recall", () => {
    expect(calculateWU(60, 9, 1.0)).toBe(240);
  });

  it("penalised recall — 30 min, resistance 5, 0.5x recall", () => {
    expect(calculateWU(30, 5, 0.5)).toBe(30);
  });

  it("max scenario — 90 min, resistance 10, full recall = 360 WU", () => {
    expect(calculateWU(90, 10, 1.0)).toBe(360);
  });

  it("minimum scenario — 1 min, resistance 1, 0.5x recall = 0.5 WU", () => {
    expect(calculateWU(1, 1, 0.5)).toBe(0.5);
  });

  it("rounds to 2 decimal places", () => {
    const result = calculateWU(7, 4, 0.75);
    expect(result).toBe(10.5); // 7 * 2 * 0.75
    expect(result.toString().split(".")[1]?.length ?? 0).toBeLessThanOrEqual(2);
  });
});

// ─── Recall heuristic ─────────────────────────────────────────────────────────
describe("evaluateRecallHeuristic", () => {
  const taskTitle = "Study quantum mechanics chapter 3";

  it("returns 0.5 for very short with no keyword overlap", () => {
    expect(evaluateRecallHeuristic("I studied", taskTitle)).toBe(0.5);
  });

  it("returns 0.75 for short input with keyword overlap", () => {
    // has 'quantum' keyword but less than 20 words
    const input = "I learned about quantum states today , how atoms could have more than one state at a time";
    expect(evaluateRecallHeuristic(input, taskTitle)).toBe(0.75);
  });

  it("returns 0.75 for substantial input with no keyword overlap", () => {
    // 20+ words, no keyword match
    const input = "I went through the material carefully and made notes on states about all the concepts presented in the reading section today";
    expect(evaluateRecallHeuristic(input, taskTitle)).toBe(0.75);
  });

  it("returns 1.0 for substantial input with keyword overlap", () => {
    const input = "I studied quantum mechanics thoroughly and understood the wave function collapse and superposition principles from chapter three of the textbook";
    expect(evaluateRecallHeuristic(input, taskTitle)).toBe(1.0);
  });

  it("returns 1.0 for thorough input (50+ words) with keyword overlap", () => {
    const input = Array(55).fill("quantum").join(" "); // 55 words, keyword present
    expect(evaluateRecallHeuristic(input, taskTitle)).toBe(1.0);
  });

  it("is case insensitive on keyword matching", () => {
    const input = "I learned about QUANTUM physics and how wave function collapse and defined the superposition principle";
    expect(evaluateRecallHeuristic(input, taskTitle)).toBe(0.75);
  });

  it("ignores short task words (<=3 chars) in keyword matching", () => {
    // 'the', 'in' etc should not count as keyword overlap
    const shortTask = "Do it now";
    const input = "I did it now completely and thoroughly"; // overlap on 'now' (3 chars — excluded)
    // 'now' is 3 chars, filtered out — no overlap
    expect(evaluateRecallHeuristic(input, shortTask)).toBe(0.5); // substantial but no overlap
  });

  it("handles empty input gracefully", () => {
    expect(evaluateRecallHeuristic("", taskTitle)).toBe(0.5);
  });

  it("handles single word input", () => {
    expect(evaluateRecallHeuristic("quantum", taskTitle)).toBe(0.75); // overlap, not substantial
  });
});