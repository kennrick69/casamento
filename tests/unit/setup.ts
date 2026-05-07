// Global setup for Vitest unit/integration tests.
// Mocks heavy infrastructure (DB, email, storage) so unit tests stay fast.

import { vi } from "vitest";

// Prevent real DB connections in unit tests
vi.mock("@/lib/db", () => ({
  prisma: {
    event: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn() },
    guest: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn() },
    guestPoints: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), upsert: vi.fn() },
    pointEvent: { create: vi.fn(), count: vi.fn() },
    mission: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), createMany: vi.fn() },
    chatMessage: { create: vi.fn(), findMany: vi.fn() },
    playlistSuggestion: { create: vi.fn() },
    playlistVote: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    photo: { create: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    checkinCode: { findUnique: vi.fn() },
    checkin: { findFirst: vi.fn(), create: vi.fn() },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
  },
}));

vi.mock("@/lib/email", () => ({
  email: { send: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@/lib/storage", () => ({
  storage: { upload: vi.fn().mockResolvedValue(undefined), get: vi.fn(), delete: vi.fn() },
}));

vi.mock("@/lib/realtime", () => ({
  realtime: { trigger: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
}));
