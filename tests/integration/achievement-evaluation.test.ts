import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// ─── Mock session ─────────────────────────────────────────────────────────────
const MOCK_USER_ID = "user_test_123";

function mockAuthedSession() {
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user: { id: MOCK_USER_ID, name: "Test User", email: "test@test.com" },
    session: { id: "session_123" },
  } as any);
}

function mockUnauthSession() {
  vi.mocked(auth.api.getSession).mockResolvedValue(null as any);
}

const {
  createTask,
  startTaskTimer,
  completeTask,
  failTask,
  updateTask,
  deleteTask,
} = await import("@/app/actions/mission-actions");

const {
  evaluateHiddenAchievements,
  evaluateMasteryAchievements,
} = await import("@/app/actions/achievement-store");

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthedSession();
});

// ─── createTask ───────────────────────────────────────────────────────────────
describe("createTask", () => {
  it("creates task when domain belongs to user", async () => {
    vi.mocked(prisma.domain.findFirst).mockResolvedValue({
      id: "d1", name: "Physical", userId: MOCK_USER_ID,
    } as any);

    vi.mocked(prisma.task.create).mockResolvedValue({
      id: "t1", title: "Morning run", resistanceLevel: 5,
      domainId: "d1", userId: MOCK_USER_ID,
    } as any);

    const result = await createTask({
      title: "  Morning run  ",
      domainId: "d1",
      resistanceLevel: 5,
    });

    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Morning run", // trimmed
          userId: MOCK_USER_ID,
          domainId: "d1",
          resistanceLevel: 5,
        }),
      })
    );
    expect(result.title).toBe("Morning run");
  });

  it("throws when domain does not belong to user", async () => {
    vi.mocked(prisma.domain.findFirst).mockResolvedValue(null as any);

    await expect(
      createTask({ title: "Task", domainId: "other_domain", resistanceLevel: 3 })
    ).rejects.toThrow("Domain not found");
  });

  it("throws when unauthenticated", async () => {
    mockUnauthSession();
    await expect(
      createTask({ title: "Task", domainId: "d1", resistanceLevel: 3 })
    ).rejects.toThrow("Unauthorized");
  });
});

// ─── startTaskTimer ───────────────────────────────────────────────────────────
describe("startTaskTimer", () => {
  it("sets startedAt timestamp on task", async () => {
    vi.mocked(prisma.task.updateMany).mockResolvedValue({ count: 1 });

    await startTaskTimer("t1");

    const callArg = vi.mocked(prisma.task.updateMany).mock.calls[0][0];
    expect((callArg.data as any).startedAt).toBeInstanceOf(Date);
    expect(callArg.where).toMatchObject({ id: "t1", userId: MOCK_USER_ID });
  });

  it("throws when unauthenticated", async () => {
    mockUnauthSession();
    await expect(startTaskTimer("t1")).rejects.toThrow("Unauthorized");
  });
});

// ─── completeTask ─────────────────────────────────────────────────────────────
describe("completeTask", () => {
  it("calculates WU correctly from stored startedAt", async () => {
    const startedAt = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

    vi.mocked(prisma.task.findFirst).mockResolvedValue({
      startedAt, resistanceLevel: 5, // 2x multiplier
    } as any);

    vi.mocked(prisma.task.updateMany).mockResolvedValue({ count: 1 });

    const result = await completeTask({ taskId: "t1", recallMultiplier: 1.0 });

    // 30 min * 2x resistance * 1.0 recall = 60 WU
    expect(result.calculatedWU).toBe(60);
    expect(result.durationMinutes).toBe(30);
  });

  it("applies recall multiplier correctly", async () => {
    const startedAt = new Date(Date.now() - 60 * 60 * 1000); // 60 min ago

    vi.mocked(prisma.task.findFirst).mockResolvedValue({
      startedAt, resistanceLevel: 7, // 4x multiplier
    } as any);
    vi.mocked(prisma.task.updateMany).mockResolvedValue({ count: 1 });

    const result = await completeTask({ taskId: "t1", recallMultiplier: 0.5 });

    // 60 * 4 * 0.5 = 120 WU
    expect(result.calculatedWU).toBe(120);
  });

  it("uses 1 minute minimum when no startedAt", async () => {
    vi.mocked(prisma.task.findFirst).mockResolvedValue({
      startedAt: null, resistanceLevel: 1,
    } as any);
    vi.mocked(prisma.task.updateMany).mockResolvedValue({ count: 1 });

    const result = await completeTask({ taskId: "t1", recallMultiplier: 1.0 });

    expect(result.durationMinutes).toBe(1);
    expect(result.calculatedWU).toBe(1); // 1 * 1 * 1
  });

  it("writes Completed status to DB", async () => {
    vi.mocked(prisma.task.findFirst).mockResolvedValue({
      startedAt: new Date(Date.now() - 10 * 60 * 1000),
      resistanceLevel: 3,
    } as any);
    vi.mocked(prisma.task.updateMany).mockResolvedValue({ count: 1 });

    await completeTask({ taskId: "t1", recallMultiplier: 1.0 });

    const callArg = vi.mocked(prisma.task.updateMany).mock.calls[0][0];
    expect((callArg.data as any).status).toBe("Completed");
  });

  it("throws when unauthenticated", async () => {
    mockUnauthSession();
    await expect(
      completeTask({ taskId: "t1", recallMultiplier: 1.0 })
    ).rejects.toThrow("Unauthorized");
  });
});

// ─── failTask ─────────────────────────────────────────────────────────────────
describe("failTask", () => {
  it("sets status to Failed", async () => {
    vi.mocked(prisma.task.updateMany).mockResolvedValue({ count: 1 });

    await failTask("t1");

    expect(prisma.task.updateMany).toHaveBeenCalledWith({
      where: { id: "t1", userId: MOCK_USER_ID },
      data: { status: "Failed" },
    });
  });

  it("throws when unauthenticated", async () => {
    mockUnauthSession();
    await expect(failTask("t1")).rejects.toThrow("Unauthorized");
  });
});

// ─── updateTask ───────────────────────────────────────────────────────────────
describe("updateTask", () => {
  it("updates only provided fields", async () => {
    vi.mocked(prisma.task.updateMany).mockResolvedValue({ count: 1 });

    await updateTask("t1", { title: "New Title" });

    const callArg = vi.mocked(prisma.task.updateMany).mock.calls[0][0];
    expect((callArg.data as any).title).toBe("New Title");
    expect((callArg.data as any).resistanceLevel).toBeUndefined();
  });

  it("trims title whitespace", async () => {
    vi.mocked(prisma.task.updateMany).mockResolvedValue({ count: 1 });
    await updateTask("t1", { title: "  Trimmed Title  " });

    const callArg = vi.mocked(prisma.task.updateMany).mock.calls[0][0];
    expect((callArg.data as any).title).toBe("Trimmed Title");
  });

  it("throws when unauthenticated", async () => {
    mockUnauthSession();
    await expect(updateTask("t1", { title: "x" })).rejects.toThrow("Unauthorized");
  });
});

// ─── deleteTask ───────────────────────────────────────────────────────────────
describe("deleteTask", () => {
  it("deletes task scoped to current user", async () => {
    vi.mocked(prisma.task.deleteMany).mockResolvedValue({ count: 1 });

    await deleteTask("t1");

    expect(prisma.task.deleteMany).toHaveBeenCalledWith({
      where: { id: "t1", userId: MOCK_USER_ID },
    });
  });

  it("throws when unauthenticated", async () => {
    mockUnauthSession();
    await expect(deleteTask("t1")).rejects.toThrow("Unauthorized");
  });
});

// ─── evaluateHiddenAchievements ───────────────────────────────────────────────
describe("evaluateHiddenAchievements", () => {
  it("unlocks immovable for resistance 10", async () => {
    vi.mocked(prisma.task.findFirst).mockResolvedValue({
      resistanceLevel: 10,
      durationMinutes: 30,
      calculatedWU: 120,
      startedAt: new Date(),
    } as any);

    // No existing achievements
    vi.mocked(prisma.achievement.findMany).mockResolvedValue([]);
    vi.mocked(prisma.achievement.createMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.task.count).mockResolvedValue(0);
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);
    vi.mocked(prisma.domain.count).mockResolvedValue(7);

    const newKeys = await evaluateHiddenAchievements("t1");
    expect(newKeys).toContain("immovable");
  });

  it("unlocks marathon for 90+ min task", async () => {
    vi.mocked(prisma.task.findFirst).mockResolvedValue({
      resistanceLevel: 3,
      durationMinutes: 95,
      calculatedWU: 95,
      startedAt: new Date(),
    } as any);

    vi.mocked(prisma.achievement.findMany).mockResolvedValue([]);
    vi.mocked(prisma.achievement.createMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.task.count).mockResolvedValue(0);
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);
    vi.mocked(prisma.domain.count).mockResolvedValue(7);

    const newKeys = await evaluateHiddenAchievements("t1");
    expect(newKeys).toContain("marathon");
  });

  it("unlocks iron_will after 5 high resistance tasks", async () => {
    vi.mocked(prisma.task.findFirst).mockResolvedValue({
      resistanceLevel: 9,
      durationMinutes: 20,
      calculatedWU: 80,
      startedAt: new Date(),
    } as any);

    vi.mocked(prisma.achievement.findMany).mockResolvedValue([]);
    vi.mocked(prisma.achievement.createMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);
    vi.mocked(prisma.domain.count).mockResolvedValue(7);

    // 5 high resistance tasks
    vi.mocked(prisma.task.count).mockResolvedValue(5);

    const newKeys = await evaluateHiddenAchievements("t1");
    expect(newKeys).toContain("iron_will");
  });

  it("does not re-unlock already unlocked achievements", async () => {
    vi.mocked(prisma.task.findFirst).mockResolvedValue({
      resistanceLevel: 10,
      durationMinutes: 95,
      calculatedWU: 380,
      startedAt: new Date(),
    } as any);

    // Already unlocked both
    vi.mocked(prisma.achievement.findMany).mockResolvedValue([
      { key: "immovable" } as any,
      { key: "marathon"  } as any,
    ]);
    vi.mocked(prisma.task.count).mockResolvedValue(0);
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);
    vi.mocked(prisma.domain.count).mockResolvedValue(7);

    const newKeys = await evaluateHiddenAchievements("t1");
    expect(newKeys).not.toContain("immovable");
    expect(newKeys).not.toContain("marathon");
  });

  it("returns empty array when task not found", async () => {
    vi.mocked(prisma.task.findFirst).mockResolvedValue(null as any);
    const newKeys = await evaluateHiddenAchievements("t1");
    expect(newKeys).toEqual([]);
  });
});

// ─── evaluateMasteryAchievements ──────────────────────────────────────────────
describe("evaluateMasteryAchievements", () => {
  it("unlocks novice when domain has 25+ WU", async () => {
    vi.mocked(prisma.domain.findMany).mockResolvedValue([
      {
        name: "Physical",
        tasks: [{ calculatedWU: 51 }], // 30 WU — above novice threshold
      },
    ] as any);

    vi.mocked(prisma.achievement.findMany).mockResolvedValue([]);
    vi.mocked(prisma.achievement.createMany).mockResolvedValue({ count: 1 });

    const newKeys = await evaluateMasteryAchievements();
    expect(newKeys).toContain("physical_novice");
  });

  it("unlocks all tiers below current WU", async () => {
    vi.mocked(prisma.domain.findMany).mockResolvedValue([
      {
        name: "Mental",
        tasks: [{ calculatedWU: 150 }], // above apprentice (100), below operator (300)
      },
    ] as any);

    vi.mocked(prisma.achievement.findMany).mockResolvedValue([]);
    vi.mocked(prisma.achievement.createMany).mockResolvedValue({ count: 2 });

    const newKeys = await evaluateMasteryAchievements();
    expect(newKeys).toContain("mental_novice");
    expect(newKeys).toContain("mental_apprentice");
    expect(newKeys).not.toContain("mental_operator");
    expect(newKeys).not.toContain("mental_elite");
  });

  it("unlocks elite at 750+ WU", async () => {
    vi.mocked(prisma.domain.findMany).mockResolvedValue([
      {
        name: "Financial",
        tasks: [{ calculatedWU: 1200 }],
      },
    ] as any);

    vi.mocked(prisma.achievement.findMany).mockResolvedValue([]);
    vi.mocked(prisma.achievement.createMany).mockResolvedValue({ count: 4 });

    const newKeys = await evaluateMasteryAchievements();
    expect(newKeys).toContain("financial_elite");
  });

  it("does not unlock anything below threshold", async () => {
    vi.mocked(prisma.domain.findMany).mockResolvedValue([
      {
        name: "Social",
        tasks: [{ calculatedWU: 10 }], // below novice threshold of 25
      },
    ] as any);

    vi.mocked(prisma.achievement.findMany).mockResolvedValue([]);
    vi.mocked(prisma.achievement.createMany).mockResolvedValue({ count: 0 });

    const newKeys = await evaluateMasteryAchievements();
    expect(newKeys).toHaveLength(0);
  });
});