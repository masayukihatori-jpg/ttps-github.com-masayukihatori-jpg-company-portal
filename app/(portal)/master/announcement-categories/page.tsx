import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Header from "@/components/layout/Header";
import AnnouncementCategoryManager from "./AnnouncementCategoryManager";

export default async function AnnouncementCategoriesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") redirect("/announcements");
  const categories = await prisma.announcementCategoryMaster.findMany({ orderBy: { order: "asc" } });
  return (
    <>
      <Header title="お知らせカテゴリ管理" />
      <main className="flex-1 p-6 max-w-2xl">
        <p className="text-sm text-gray-500 mb-5">お知らせに選択できるカテゴリを管理します。</p>
        <AnnouncementCategoryManager initial={categories} />
      </main>
    </>
  );
}
