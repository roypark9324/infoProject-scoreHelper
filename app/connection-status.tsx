"use client";

import { useEffect, useState } from "react";
import { checkConnection, type ConnectionResult } from "@/lib/supabase";

// 차시 6: Supabase 연결 상태를 화면 아래에 작게 보여 준다. (연결 확인용)
export default function ConnectionStatus() {
  const [result, setResult] = useState<ConnectionResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    checkConnection().then((r) => {
      if (!cancelled) setResult(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!result) {
    return <p className="mt-2 text-center text-xs text-neutral-400">DB 연결 확인 중…</p>;
  }
  return (
    <p
      className={`mt-2 text-center text-xs ${result.ok ? "text-green-600" : "text-red-600"}`}
    >
      {result.ok ? "● " : "○ "}
      {result.message}
    </p>
  );
}
