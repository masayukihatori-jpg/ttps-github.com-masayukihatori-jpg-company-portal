"use client";

import { createContext, useContext, useState, useRef, useCallback } from "react";

interface EditModeContextType {
  isEditMode: boolean;
  isAdmin: boolean;
  discardKey: number; // 破棄時にインクリメント→コンポーネントを再マウントして初期状態に戻す
  enterEditMode: () => void;
  discardAndExit: () => void;
  saveAndExit: () => Promise<void>;
  registerSaveHandler: (fn: (() => Promise<void>) | null) => void;
}

const EditModeContext = createContext<EditModeContextType>({
  isEditMode: false,
  isAdmin: false,
  discardKey: 0,
  enterEditMode: () => {},
  discardAndExit: () => {},
  saveAndExit: async () => {},
  registerSaveHandler: () => {},
});

export function EditModeProvider({
  children,
  isAdmin,
}: {
  children: React.ReactNode;
  isAdmin: boolean;
}) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [discardKey, setDiscardKey] = useState(0);
  const saveHandlerRef = useRef<(() => Promise<void>) | null>(null);

  const enterEditMode = useCallback(() => setIsEditMode(true), []);

  const discardAndExit = useCallback(() => {
    setIsEditMode(false);
    setDiscardKey((k) => k + 1); // コンポーネント再マウントで変更を破棄
  }, []);

  const saveAndExit = useCallback(async () => {
    if (saveHandlerRef.current) {
      await saveHandlerRef.current();
    }
    setIsEditMode(false);
  }, []);

  const registerSaveHandler = useCallback(
    (fn: (() => Promise<void>) | null) => {
      saveHandlerRef.current = fn;
    },
    []
  );

  return (
    <EditModeContext.Provider
      value={{ isEditMode, isAdmin, discardKey, enterEditMode, discardAndExit, saveAndExit, registerSaveHandler }}
    >
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  return useContext(EditModeContext);
}
