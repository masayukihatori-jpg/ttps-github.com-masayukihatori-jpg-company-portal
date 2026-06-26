import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import UserManager from "./UserManager";

export default async function UsersPage() {
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
          myId=""
        />
      </main>
    </>
  );
}
