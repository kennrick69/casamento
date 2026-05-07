import { describe, it, expect, vi, beforeEach } from "vitest";
import { awardPoints, seedDefaultMissions } from "@/lib/points";
import { prisma } from "@/lib/db";

const mockMission = {
  id: "m1",
  eventId: "e1",
  code: "rsvp_confirmed",
  title: "Confirmou presença",
  points: 50,
  dailyCap: null,
  totalCap: null,
  active: true,
  order: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("awardPoints", () => {
  it("awards points for an active mission", async () => {
    vi.mocked(prisma.mission.findUnique).mockResolvedValue(mockMission as never);
    vi.mocked(prisma.pointEvent.count).mockResolvedValue(0);
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}] as never);

    const result = await awardPoints("g1", "e1", "rsvp_confirmed");
    expect(result.awarded).toBe(true);
    expect(result.points).toBe(50);
  });

  it("returns not awarded for inactive mission", async () => {
    vi.mocked(prisma.mission.findUnique).mockResolvedValue({ ...mockMission, active: false } as never);

    const result = await awardPoints("g1", "e1", "rsvp_confirmed");
    expect(result.awarded).toBe(false);
  });

  it("returns not awarded for non-existent mission", async () => {
    vi.mocked(prisma.mission.findUnique).mockResolvedValue(null);

    const result = await awardPoints("g1", "e1", "unknown_mission");
    expect(result.awarded).toBe(false);
  });

  it("respects daily cap", async () => {
    const cappedMission = { ...mockMission, code: "chat_message", dailyCap: 5 };
    vi.mocked(prisma.mission.findUnique).mockResolvedValue(cappedMission as never);
    vi.mocked(prisma.pointEvent.count).mockResolvedValue(5); // already at cap

    const result = await awardPoints("g1", "e1", "chat_message");
    expect(result.awarded).toBe(false);
    expect(result.reason).toBe("daily_cap");
  });

  it("allows award when under daily cap", async () => {
    const cappedMission = { ...mockMission, code: "chat_message", dailyCap: 5, points: 10 };
    vi.mocked(prisma.mission.findUnique).mockResolvedValue(cappedMission as never);
    vi.mocked(prisma.pointEvent.count).mockResolvedValue(3); // under cap
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}] as never);

    const result = await awardPoints("g1", "e1", "chat_message");
    expect(result.awarded).toBe(true);
    expect(result.points).toBe(10);
  });

  it("respects total cap", async () => {
    const cappedMission = { ...mockMission, totalCap: 1 };
    vi.mocked(prisma.mission.findUnique).mockResolvedValue(cappedMission as never);
    vi.mocked(prisma.pointEvent.count).mockResolvedValue(1); // at total cap

    const result = await awardPoints("g1", "e1", "rsvp_confirmed");
    expect(result.awarded).toBe(false);
    expect(result.reason).toBe("total_cap");
  });
});

describe("seedDefaultMissions", () => {
  it("does not seed if missions already exist", async () => {
    vi.mocked(prisma.mission.count).mockResolvedValue(7);

    await seedDefaultMissions("e1");
    expect(prisma.mission.createMany).not.toHaveBeenCalled();
  });

  it("seeds 7 default missions when none exist", async () => {
    vi.mocked(prisma.mission.count).mockResolvedValue(0);
    vi.mocked(prisma.mission.createMany).mockResolvedValue({ count: 7 } as never);

    await seedDefaultMissions("e1");
    expect(prisma.mission.createMany).toHaveBeenCalledOnce();
    const callArg = vi.mocked(prisma.mission.createMany).mock.calls[0]?.[0];
    expect(callArg?.data).toHaveLength(7);
  });
});

// Edge cases / scenarios
describe("awardPoints — edge cases", () => {
  it("daily cap check uses today's count, not all-time count", async () => {
    const mission = { ...mockMission, dailyCap: 3, code: "photo_upload" };
    vi.mocked(prisma.mission.findUnique).mockResolvedValue(mission as never);
    // count returns 2 (under cap) — should award
    vi.mocked(prisma.pointEvent.count).mockResolvedValue(2);
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}] as never);

    const result = await awardPoints("g1", "e1", "photo_upload");
    expect(result.awarded).toBe(true);
  });

  it("transaction is called with both pointEvent create and guestPoints upsert", async () => {
    vi.mocked(prisma.mission.findUnique).mockResolvedValue(mockMission as never);
    vi.mocked(prisma.pointEvent.count).mockResolvedValue(0);
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}] as never);

    await awardPoints("g1", "e1", "rsvp_confirmed");
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });
});
