import { describe, it, expect } from "vitest";
import {
  ALL_ACHIEVEMENTS,
  MASTERY_WU,
  DOMAINS,
  MASTERY_TIERS,
  masteryKey,
  getAchievementMeta,
  TOTAL_ALL,
  TOTAL_HIDDEN,
  TOTAL_MASTERY,
} from "@/lib/Achievements";

describe("achievement catalogue — integrity", () => {
  it("total count is 36 (28 mastery + 8 hidden)", () => {
    expect(TOTAL_MASTERY).toBe(28);
    expect(TOTAL_HIDDEN).toBe(8);
    expect(TOTAL_ALL).toBe(36);
    expect(ALL_ACHIEVEMENTS).toHaveLength(36);
  });

  it("every achievement has a unique key", () => {
    const keys = ALL_ACHIEVEMENTS.map((a) => a.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it("every achievement has required fields", () => {
    for (const a of ALL_ACHIEVEMENTS) {
      expect(a.key,         `${a.key} missing key`).toBeTruthy();
      expect(a.name,        `${a.key} missing name`).toBeTruthy();
      expect(a.description, `${a.key} missing description`).toBeTruthy();
      expect(a.icon,        `${a.key} missing icon`).toBeTruthy();
      expect(["mastery", "hidden"]).toContain(a.type);
    }
  });

  it("mastery achievements cover all 7 domains × 4 tiers", () => {
    const masteryAchievements = ALL_ACHIEVEMENTS.filter((a) => a.type === "mastery");
    expect(masteryAchievements).toHaveLength(28);

    for (const domain of DOMAINS) {
      for (const { tier } of MASTERY_TIERS) {
        const key = masteryKey(domain, tier);
        const found = masteryAchievements.find((a) => a.key === key);
        expect(found, `Missing mastery achievement: ${key}`).toBeDefined();
      }
    }
  });

  it("mastery achievements have correct domain and tier fields", () => {
    const masteryAchievements = ALL_ACHIEVEMENTS.filter((a) => a.type === "mastery");
    for (const a of masteryAchievements) {
      expect(a.domain, `${a.key} missing domain`).toBeTruthy();
      expect(a.tier,   `${a.key} missing tier`).toBeTruthy();
      expect(DOMAINS).toContain(a.domain);
      expect(["novice", "apprentice", "operator", "elite"]).toContain(a.tier);
    }
  });

  it("hidden achievements have hidden: true", () => {
    const hidden = ALL_ACHIEVEMENTS.filter((a) => a.type === "hidden");
    for (const a of hidden) {
      expect(a.hidden, `${a.key} should have hidden: true`).toBe(true);
    }
  });

  it("mastery achievements have hidden: false", () => {
    const mastery = ALL_ACHIEVEMENTS.filter((a) => a.type === "mastery");
    for (const a of mastery) {
      expect(a.hidden, `${a.key} should have hidden: false`).toBe(false);
    }
  });

  it("MASTERY_WU tiers are in ascending order", () => {
    expect(MASTERY_WU.novice).toBeLessThan(MASTERY_WU.apprentice);
    expect(MASTERY_WU.apprentice).toBeLessThan(MASTERY_WU.operator);
    expect(MASTERY_WU.operator).toBeLessThan(MASTERY_WU.elite);
  });

  it("MASTERY_WU values match expected thresholds", () => {
    expect(MASTERY_WU.novice).toBe(50);
    expect(MASTERY_WU.apprentice).toBe(140);
    expect(MASTERY_WU.operator).toBe(400);
    expect(MASTERY_WU.elite).toBe(1100);
  });
});

describe("getAchievementMeta", () => {
  it("returns correct meta for a known mastery key", () => {
    const meta = getAchievementMeta("physical_elite");
    expect(meta).toBeDefined();
    expect(meta?.name).toBe("Physical — Elite");
    expect(meta?.tier).toBe("elite");
    expect(meta?.domain).toBe("Physical");
  });

  it("returns correct meta for a known hidden key", () => {
    const meta = getAchievementMeta("iron_will");
    expect(meta).toBeDefined();
    expect(meta?.type).toBe("hidden");
    expect(meta?.hidden).toBe(true);
  });

  it("returns undefined for unknown key", () => {
    expect(getAchievementMeta("does_not_exist")).toBeUndefined();
  });

  it("returns correct meta for all 7 domain elite tiers", () => {
    for (const domain of DOMAINS) {
      const meta = getAchievementMeta(masteryKey(domain, "elite"));
      expect(meta, `Missing elite meta for ${domain}`).toBeDefined();
      expect(meta?.tier).toBe("elite");
    }
  });
});

describe("masteryKey", () => {
  it("generates lowercase underscore key", () => {
    expect(masteryKey("Physical", "elite")).toBe("physical_elite");
    expect(masteryKey("Mental", "novice")).toBe("mental_novice");
  });

  it("handles all domains correctly", () => {
    for (const domain of DOMAINS) {
      for (const { tier } of MASTERY_TIERS) {
        const key = masteryKey(domain, tier);
        expect(key).toBe(`${domain.toLowerCase()}_${tier}`);
      }
    }
  });
});