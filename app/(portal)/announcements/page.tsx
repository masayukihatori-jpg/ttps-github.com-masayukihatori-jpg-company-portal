'use client';

import { useState, useEffect } from 'react';
import Header from "@/components/layout/Header";
import QAInterface from "@/components/qa/QAInterface";

export default function AnnouncementsPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // テスト用のダミーユーザーID
    setUserId('test-user-' + Math.random().toString(36).substr(2, 9));
  }, []);

  return (
    <>
      <Header title="ヘルプデスク" />
      <main className="flex-1 pt-6 px-6 pb-0 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-auto flex flex-col gap-6">
          {userId && <QAInterface userId={userId} />}
        </div>
      </main>
    </>
  );
}
