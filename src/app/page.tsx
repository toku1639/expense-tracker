"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** 静的エクスポート向けにクライアントで入力タブへ誘導 */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/input/");
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center py-16 text-sm text-slate-400">
      入力画面へ移動しています…
    </div>
  );
}
