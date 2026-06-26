'use client';

import { useState, useEffect } from 'react';

export const dynamic = 'force-dynamic';

export default function AnnouncementsPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    console.log('AnnouncementsPage mounted');
    setUserId('test-user-' + Math.random().toString(36).substr(2, 9));
  }, []);

  if (!userId) return <div>Loading...</div>;

  return <div>Hello! This is the announcements page. UserID: {userId}</div>;
}
