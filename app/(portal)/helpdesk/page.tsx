import Header from "@/components/layout/Header";
import { EditModeGate } from "@/components/layout/EditModeGate";
import HelpdeskNavigator from "./HelpdeskNavigator";
import HelpdeskTreeEditor from "./HelpdeskTreeEditor";

export default function HelpdeskPage() {
  return (
    <>
      <Header title="ヘルプデスク" />
      <main className="flex-1 p-6 max-w-5xl space-y-8">

        {/* ユーザー向けナビゲーター */}
        <section>
          <HelpdeskNavigator />
        </section>

        {/* 管理者向けツリーエディタ（編集モード時のみ） */}
        <EditModeGate>
          <section className="border-t pt-8">
            <div className="mb-4">
              <h2 className="text-base font-bold text-gray-700">ツリー編集</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                ノードを追加・編集・削除してヘルプデスクの案内ツリーを構成します。最大10階層まで設定できます。
              </p>
            </div>
            <HelpdeskTreeEditor />
          </section>
        </EditModeGate>

      </main>
    </>
  );
}
