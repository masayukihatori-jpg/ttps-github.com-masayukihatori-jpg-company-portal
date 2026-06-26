import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import Link from "next/link";
import { notFound } from "next/navigation";
import DeleteButton from "./DeleteButton";
import { EditModeGate } from "@/components/layout/EditModeGate";

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [announcement, user] = await Promise.all([
    prisma.announcement.findUnique({
      where: { id },
    }),
    prisma.user.findUnique({
      where: { email: session?.user?.email! },
    }),
  ]);

  if (!announcement) notFound();

  const isAdmin = user?.role === "ADMIN";
  // 下書きは管理者のみアクセス可能
  if (announcement.isDraft && !isAdmin) notFound();

  return (
    <>
      <Header title="お知らせ詳細" />
      <main className="flex-1 p-6">
        {/* パンくず */}
        <nav className="text-sm text-gray-400 mb-5">
          <Link href="/announcements" className="hover:text-[#0067B8]">
            お知らせ一覧
          </Link>
          <span className="mx-2">›</span>
          <span className="text-gray-600">{announcement.title}</span>
        </nav>

        {announcement.isDraft && (
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
            <span className="text-sm text-amber-700">下書きが保存されています</span>
            <Link href={`/announcements/${id}/edit`} className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition-colors">
              公開する
            </Link>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* ヘッダー */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              {announcement.isDraft && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">
                  下書き
                </span>
              )}
              {announcement.important && (
                <span className="text-xs bg-red-100 text-red-600 px-2.5 py-1 rounded-full font-medium">
                  🔴 重要
                </span>
              )}
              <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                {announcement.category}
              </span>
              {announcement.organization && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full">
                  {announcement.organization}
                </span>
              )}
              {announcement.slackSent && (
                <span className="text-xs bg-green-100 text-green-600 px-2.5 py-1 rounded-full">
                  💬 Slack通知済み
                </span>
              )}
            </div>
            <EditModeGate>
              <div className="flex gap-2 ml-4">
                <Link
                  href={`/announcements/${id}/edit`}
                  className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50"
                >
                  編集
                </Link>
                <DeleteButton id={id} />
              </div>
            </EditModeGate>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {announcement.title}
          </h1>

          {/* 日時 */}
          <div className="pb-5 border-b border-gray-100 mb-5">
            <p className="text-xs text-gray-400">
              {new Date(announcement.publishedAt).toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          {/* 本文 */}
          <div
            className="prose prose-sm max-w-none text-gray-700 leading-relaxed
              prose-headings:font-semibold prose-headings:text-gray-800
              prose-h2:text-base prose-h3:text-sm
              prose-a:text-[#0067B8] prose-a:underline
              prose-ul:list-disc prose-ul:pl-5
              prose-ol:list-decimal prose-ol:pl-5"
            dangerouslySetInnerHTML={{ __html: announcement.content }}
          />
        </div>
      </main>
    </>
  );
}
