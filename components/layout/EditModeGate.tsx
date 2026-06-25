"use client";
// 編集モード中かつ管理者の場合のみ子要素を表示するゲートコンポーネント
import { useEditMode } from "@/contexts/EditModeContext";

export function EditModeGate({ children }: { children: React.ReactNode }) {
  const { isEditMode, isAdmin } = useEditMode();
  if (!isAdmin || !isEditMode) return null;
  return <>{children}</>;
}
