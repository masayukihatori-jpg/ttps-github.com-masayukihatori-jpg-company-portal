import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Header from "@/components/layout/Header";
import UserManager from "./UserManager";

export default async function UsersPage() {
  const session = await auth();
  const me = await prisma.user.findUnique({ where: { email: session?.user?.email! } });

  // 管理者以外はアクセス不可
  if (!me || me.role !== "ADMIN") redirect("/announcements");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      department: true,
      position: true,
      createdAt: true,
    },
  });

  return (
    <>
      <Header title="ユーザー管理" />
      <main className="flex-1 p-6">
        <UserManager
          initialUsers={users.map((u) => ({
            ...u,
            role: u.role as string,
            createdAt: u.createdAt.toISOString(),
          }))}
          myId={me.id}
        />
      </main>
    </>
  );
}
