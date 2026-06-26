export default async function TestPage() {
  const authRequired = false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-[#0067B8] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-2xl font-bold">社</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">社内ポータル</h1>
        <p className="text-gray-600 mb-2">
          {authRequired ? "🔒 ログイン必須" : "✅ 認証なしでアクセス可能"}
        </p>
        <p className="text-sm text-gray-500 mb-6">
          認証設定: {authRequired ? "ON" : "OFF"}
        </p>

        {!authRequired && (
          <a
            href="/announcements"
            className="inline-block bg-[#0067B8] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#005a9e] transition-colors"
          >
            お知らせを見る
          </a>
        )}
      </div>
    </div>
  );
}
