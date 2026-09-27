// 차시 4: 원인 분석 (IPO의 '출력 2 · 사유별 막대그래프')
// - 벌점 기록을 사유별로 묶어 점수 합계가 큰 순으로 막대를 그린다.
// - 상위 3개는 진하게 표시하고, 1위 원인을 문장으로 알려 준다.

import { analyzeCauses } from "@/lib/score";
import type { ScoreRecord } from "@/lib/records";

const TOP_N = 3;

export default function CauseAnalysis({ records }: { records: ScoreRecord[] }) {
  const causes = analyzeCauses(records);
  const maxTotal = causes[0]?.total ?? 0;

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <h2 className="text-sm font-bold">사유별 벌점 · 원인 분석</h2>

      {causes.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-neutral-200 px-3 py-6 text-center text-xs text-neutral-400">
          벌점 기록이 생기면 어떤 이유로 가장 많이 받았는지 여기에 보여 드려요.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-neutral-600">
            가장 많이 받은 원인은 <b className="text-red-700">{causes[0].reasonLabel}</b>
            {" "}({causes[0].count}회 · {causes[0].total}점)입니다.
          </p>

          <ul className="mt-4 grid gap-2.5">
            {causes.map((c, i) => {
              const isTop = i < TOP_N;
              const width = Math.max(4, Math.round((c.total / maxTotal) * 100));
              return (
                <li key={c.reasonId} className="text-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`min-w-0 truncate ${isTop ? "font-semibold" : "text-neutral-500"}`}>
                      {isTop && (
                        <span className="mr-1.5 text-xs font-bold text-red-600">{i + 1}위</span>
                      )}
                      {c.reasonLabel}
                    </span>
                    <span className="shrink-0 text-xs text-neutral-500">
                      {c.count}회 · <b className="text-neutral-800">{c.total}점</b>
                    </span>
                  </div>
                  <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className={`h-full rounded-full ${isTop ? "bg-red-500" : "bg-red-200"}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
