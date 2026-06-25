import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { EditModeProvider } from "@/contexts/EditModeContext";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  const isAdmin = user?.role === "ADMIN";

  // カスタムセクション一覧を取得してサイドバーに渡す
  const customSections = await prisma.contentSection.findMany({
    where: { hidden: false },
    orderBy: { order: "asc" },
    include: {
      pages: {
        orderBy: { order: "asc" },
        include: { files: { select: { id: true, isDraft: true } } },
      },
    },
  });

  const sectionItems = customSections
    .map((s) => {
      if (isAdmin) {
        // 管理者：ページ0件でも表示（firstPageSlug は null なら /s/slug にリンク）
        return {
          id: s.id, name: s.name, slug: s.slug, order: s.order,
          firstPageSlug: s.pages[0]?.slug ?? null,
        };
      } else {
        // 一般ユーザー：公開済みコンテンツのあるページが1件以上必要
        const firstVisible = s.pages.find((p) =>
          Boolean(p.content || p.embedUrl || p.files.filter((f) => !f.isDraft).length > 0)
        );
        if (!firstVisible) return null;
        return { id: s.id, name: s.name, slug: s.slug, order: s.order, firstPageSlug: firstVisible.slug };
      }
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  return (
    <EditModeProvider isAdmin={isAdmin}>
      <div className="flex h-screen bg-[#EFF2F4]">
        <Sidebar isAdmin={isAdmin} customSections={sectionItems} />
        <div className="flex-1 ml-60 flex flex-col overflow-auto">
          {children}
        </div>
      </div>
    </EditModeProvider>
  );
}
