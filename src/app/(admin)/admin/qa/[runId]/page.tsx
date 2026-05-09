import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { CHECKLIST, SECTIONS } from "@/lib/qa/checklist";
import { QARunClient } from "./qa-run-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Execução de QA" };

export default async function QARunPage({ params }: { params: Promise<{ runId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { runId } = await params;

  const run = await prisma.qATestRun.findFirst({
    where: { id: runId, createdById: session.user.id },
  });

  if (!run) notFound();

  const results = (run.results as Record<string, { status: string; note: string }>) ?? {};

  return (
    <QARunClient
      run={{
        id: run.id,
        title: run.title,
        startedAt: run.startedAt.toISOString(),
        finishedAt: run.finishedAt?.toISOString() ?? null,
        results,
        notes: run.notes,
      }}
      checklist={CHECKLIST}
      sections={SECTIONS}
    />
  );
}
