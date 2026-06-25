import Header from "@/components/layout/Header";

export const dynamic = 'force-dynamic';

export default function AnnouncementsPage() {
  return (
    <>
      <Header title="ヘルプデスク" />
      <main className="flex-1 pt-6 px-6 pb-0 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-auto flex flex-col gap-6">
          <div className="bg-white rounded-lg border border-[#EEEEEE] p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">マニュアル検索・Q&A</h2>
            <p className="text-gray-600">
              社内規程やマニュアルについての質問に、AI がお答えします。
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
