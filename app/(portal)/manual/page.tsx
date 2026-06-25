import Header from "@/components/layout/Header";

export default function ManualPage() {
  return (
    <>
      <Header title="マニュアル" />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-400 select-none">
          <div className="text-5xl mb-4">📖</div>
          <p className="text-sm">左のメニューからページを選択してください</p>
        </div>
      </main>
    </>
  );
}
