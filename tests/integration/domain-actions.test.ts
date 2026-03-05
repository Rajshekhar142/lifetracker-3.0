import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// ─── Mock session helper ──────────────────────────────────────────────────────
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

// ─── Import actions AFTER mocks are set ──────────────────────────────────────
const {
  seedDomainsIfNew,
  getDomains,
  renameDomain,
  deleteDomain,
  addCustomDomain,
} = await import("@/app/actions/domain-actions");

// ─── Reset mocks between tests ────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockAuthedSession();
});

// ─── seedDomainsIfNew ─────────────────────────────────────────────────────────
describe("seedDomainsIfNew", () => {
  it("seeds 7 domains when user has none", async () => {
    vi.mocked(prisma.domain.count).mockResolvedValue(0);
    vi.mocked(prisma.domain.createMany).mockResolvedValue({ count: 7 });

    await seedDomainsIfNew();

    expect(prisma.domain.count).toHaveBeenCalledWith({
      where: { userId: MOCK_USER_ID },
    });
    expect(prisma.domain.createMany).toHaveBeenCalledOnce();

    const callArg = vi.mocked(prisma.domain.createMany).mock.calls[0]?.[0];
    expect(callArg?.data).toHaveLength(7);
  });

  it("skips seeding when user already has domains", async () => {
    vi.mocked(prisma.domain.count).mockResolvedValue(3);

    await seedDomainsIfNew();

    expect(prisma.domain.createMany).not.toHaveBeenCalled();
  });

  it("seeds correct domain names", async () => {
    vi.mocked(prisma.domain.count).mockResolvedValue(0);
    vi.mocked(prisma.domain.createMany).mockResolvedValue({ count: 7 });

    await seedDomainsIfNew();

    const callArg = vi.mocked(prisma.domain.createMany).mock.calls[0]?.[0];
    expect(callArg).toBeDefined();
    const names = (callArg!.data as any[]).map((d: any) => d.name);

    expect(names).toContain("Physical");
    expect(names).toContain("Mental");
    expect(names).toContain("Emotional");
    expect(names).toContain("Spiritual");
    expect(names).toContain("Social");
    expect(names).toContain("Financial");
    expect(names).toContain("Vocational");
  });

  it("attaches userId to all seeded domains", async () => {
    vi.mocked(prisma.domain.count).mockResolvedValue(0);
    vi.mocked(prisma.domain.createMany).mockResolvedValue({ count: 7 });

    await seedDomainsIfNew();

    const callArg = vi.mocked(prisma.domain.createMany).mock.calls[0]?.[0];
    expect(callArg).toBeDefined();
    const allHaveUserId = (callArg!.data as any[]).every(
      (d: any) => d.userId === MOCK_USER_ID
    );
    expect(allHaveUserId).toBe(true);
  });

  it("throws when unauthenticated", async () => {
    mockUnauthSession();
    await expect(seedDomainsIfNew()).rejects.toThrow("Unauthorized");
  });
});

// ─── getDomains ───────────────────────────────────────────────────────────────
describe("getDomains", () => {
  it("returns domains for current user", async () => {
    const mockDomains = [
      { id: "d1", name: "Physical", icon: "◈", userId: MOCK_USER_ID, createdAt: new Date() },
      { id: "d2", name: "Mental",   icon: "◇", userId: MOCK_USER_ID, createdAt: new Date() },
    ];
    vi.mocked(prisma.domain.findMany).mockResolvedValue(mockDomains as any);

    const result = await getDomains();

    expect(prisma.domain.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: MOCK_USER_ID } })
    );
    expect(result).toHaveLength(2);
  });

  it("returns empty array when user has no domains", async () => {
    vi.mocked(prisma.domain.findMany).mockResolvedValue([]);
    const result = await getDomains();
    expect(result).toEqual([]);
  });

  it("throws when unauthenticated", async () => {
    mockUnauthSession();
    await expect(getDomains()).rejects.toThrow("Unauthorized");
  });
});

// ─── renameDomain ─────────────────────────────────────────────────────────────
describe("renameDomain", () => {
  it("updates domain name", async () => {
    vi.mocked(prisma.domain.updateMany).mockResolvedValue({ count: 1 });

    await renameDomain("d1", "  Physical Fitness  ");

    expect(prisma.domain.updateMany).toHaveBeenCalledWith({
      where: { id: "d1", userId: MOCK_USER_ID },
      data: { name: "Physical Fitness" }, // trimmed
    });
  });

  it("trims whitespace from new name", async () => {
    vi.mocked(prisma.domain.updateMany).mockResolvedValue({ count: 1 });
    await renameDomain("d1", "   trimmed   ");

    const callArg = vi.mocked(prisma.domain.updateMany).mock.calls[0][0];
    expect((callArg.data as any).name).toBe("trimmed");
  });

  it("throws when unauthenticated", async () => {
    mockUnauthSession();
    await expect(renameDomain("d1", "New Name")).rejects.toThrow("Unauthorized");
  });
});

// ─── deleteDomain ─────────────────────────────────────────────────────────────
describe("deleteDomain", () => {
  it("deletes domain belonging to current user", async () => {
    vi.mocked(prisma.domain.deleteMany).mockResolvedValue({ count: 1 });

    await deleteDomain("d1");

    expect(prisma.domain.deleteMany).toHaveBeenCalledWith({
      where: { id: "d1", userId: MOCK_USER_ID },
    });
  });

  it("scopes deletion to current user — cannot delete another user's domain", async () => {
    vi.mocked(prisma.domain.deleteMany).mockResolvedValue({ count: 0 });

    await deleteDomain("other_user_domain");

    // deleteMany is called but scoped — another user's domain returns count 0
    expect(prisma.domain.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: MOCK_USER_ID }) })
    );
  });

  it("throws when unauthenticated", async () => {
    mockUnauthSession();
    await expect(deleteDomain("d1")).rejects.toThrow("Unauthorized");
  });
});

// ─── addCustomDomain ──────────────────────────────────────────────────────────
describe("addCustomDomain", () => {
  it("creates a custom domain with open circle icon", async () => {
    const mockDomain = { id: "d_new", name: "Creativity", icon: "◌", userId: MOCK_USER_ID, createdAt: new Date() };
    vi.mocked(prisma.domain.create).mockResolvedValue(mockDomain as any);

    const result = await addCustomDomain("  Creativity  ");

    expect(prisma.domain.create).toHaveBeenCalledWith({
      data: {
        name: "Creativity",
        icon: "◌",
        userId: MOCK_USER_ID,
      },
    });
    expect(result.name).toBe("Creativity");
  });

  it("trims whitespace from custom domain name", async () => {
    vi.mocked(prisma.domain.create).mockResolvedValue({
      id: "d1", name: "Health", icon: "◌", userId: MOCK_USER_ID, createdAt: new Date(),
    } as any);

    await addCustomDomain("   Health   ");

    const callArg = vi.mocked(prisma.domain.create).mock.calls[0][0];
    expect((callArg.data as any).name).toBe("Health");
  });

  it("throws when unauthenticated", async () => {
    mockUnauthSession();
    await expect(addCustomDomain("NewDomain")).rejects.toThrow("Unauthorized");
  });
});