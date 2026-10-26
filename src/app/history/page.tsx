"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HistoryPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/calendar/");
  }, [router]);
  return (
    <p className="py-16 text-center text-sm text-slate-400">
      カレンダーへ移動しています…
    </p>
  );
}
