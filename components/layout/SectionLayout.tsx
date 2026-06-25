/**
 * 全コンテンツセクション共通のレイアウトラッパー。
 * nav を渡すと左サイドバー＋コンテンツの2カラム構成になる。
 * nav を省略するとコンテンツのみ（1カラム）。
 *
 * 新セクションを追加するときは layout.tsx でこれをインポートして使う。
 */
export default function SectionLayout({
  nav,
  children,
}: {
  nav?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 min-h-0">
      {nav}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {children}
      </div>
    </div>
  );
}
