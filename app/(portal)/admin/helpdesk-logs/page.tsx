import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import HelpdeskLogTable, { LogRow } from "./HelpdeskLogTable";

export default async function HelpdeskLogsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (user?.role !== "ADMIN") redirect("/announcements");

  const logs = await prisma.helpdeskLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { name: true, email: true } } },
  });

  const rows: LogRow[] = logs.map((log: typeof logs[number]) => ({
    id: log.id,
    createdAt: log.createdAt.toISOString(),
    userName: log.user.name ?? log.user.email ?? "",
    pathLabels: Array.isArray(log.pathLabels) ? (log.pathLabels as string[]) : [],
    userInputs: Array.isArray(log.userInputs)
      ? (log.userInputs as { label: string; value: string }[])
      : [],
    contextRegs: Array.isArray(log.contextRegs) ? (log.contextRegs as string[]) : [],
    contextPages: Array.isArray(log.contextPages) ? (log.contextPages as string[]) : [],
    aiAnswer: log.aiAnswer ?? null,
  }));

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold text-[#192E61]">ヘルプデスク操作履歴</h1>
      <HelpdeskLogTable logs={rows} />
    </div>
  );
}
