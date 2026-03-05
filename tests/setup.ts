import { vi } from "vitest";

// ─── Mock next/headers ────────────────────────────────────────────────────────
vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Map()),
}));

// ─── Mock next/cache ──────────────────────────────────────────────────────────
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// ─── Mock auth ────────────────────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// ─── Mock prisma ──────────────────────────────────────────────────────────────
vi.mock("@/lib/prisma", () => ({
  prisma: {
    domain: {
      count:      vi.fn(),
      create:     vi.fn(),
      createMany: vi.fn(),
      findMany:   vi.fn(),
      findFirst:  vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    task: {
      count:      vi.fn(),
      create:     vi.fn(),
      findFirst:  vi.fn(),
      findMany:   vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    achievement: {
      findMany:   vi.fn(),
      createMany: vi.fn(),
      findFirst:  vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));