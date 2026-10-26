"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AnalyticsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/report/");
  }, [router]);
  return (
    <p className="py-16 text-center text-sm text-slate-400">
      レポートへ移動しています…
    </p>
  );
}
