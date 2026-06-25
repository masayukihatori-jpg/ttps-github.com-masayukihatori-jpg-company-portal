export const dynamic = 'force-dynamic';

export default function AnnouncementsPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">ヘルプデスク</h1>
        <p className="text-gray-600 mb-6">
          AI による質問応答機能がここに表示されます
        </p>
        <a
          href="/"
          className="inline-block bg-[#0067B8] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#005a9e] transition-colors"
        >
          ホームに戻る
        </a>
      </div>
    </div>
  );
}
