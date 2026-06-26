import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import Link from "next/link";
import AnnouncementList from "../announcements/AnnouncementList";
import { EditModeGate } from "@/components/layout/EditModeGate";

export default async function HelpdeskPage() {
  const isAdmin = false;

  const announcements = await prisma.announcement.findMany({
    where: { isDraft: false },
    orderBy: [{ important: "desc" }, { publishedAt: "desc" }],
  });

  return (
    <>
      <Header title="お知らせ" />
      <main className="flex-1 pt-6 px-6 pb-0 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-auto flex flex-col gap-6">
          {/* お知らせ セクション */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-[#AAAAAA] text-sm">{announcements.length}件のお知らせ</p>
              <EditModeGate>
                <Link
                  href="/announcements/new"
                  className="bg-[#0067B8] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#005a9e] transition-colors flex items-center gap-2"
                >
                  <span>+</span> お知らせを投稿
                </Link>
              </EditModeGate>
            </div>
            <AnnouncementList
              isAdmin={isAdmin}
              announcements={announcements.map((a: typeof announcements[number]) => ({
                id: a.id,
                title: a.title,
                content: a.content,
                summary: a.summary,
                category: a.category,
                organization: a.organization,
                important: a.important,
                isDraft: a.isDraft,
                slackSent: a.slackSent,
                publishedAt: a.publishedAt.toISOString(),
              }))}
            />
          </div>
        </div>
      </main>
    </>
  );
}
