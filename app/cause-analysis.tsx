// 차시 4: 원인 분석 (IPO의 '출력 2 · 사유별 막대그래프')
// - 벌점 기록을 사유별로 묶어 점수 합계가 큰 순으로 막대를 그린다.
// - 상위 3개는 진하게 표시하고, 1위 원인을 문장으로 알려 준다.

import { analyzeCauses } from "@/lib/score";
import type { ScoreRecord } from "@/lib/records";
import { SOLUTIONS, bestTipByReason, type CommunityTip } from "@/lib/tips";

const TOP_N = 3;

interface Props {
  records: ScoreRecord[];
  /** 팁 게시판의 글. 사유마다 '도움이 돼요'가 가장 많은 팁을 해결 방안 아래에 함께 보여 준다. */
  communityTips?: CommunityTip[];
}

export default function CauseAnalysis({ records, communityTips = [] }: Props) {
  const causes = analyzeCauses(records);
  const maxTotal = causes[0]?.total ?? 0;
  const bestTips = bestTipByReason(communityTips);

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

          {/* ── 해결 방안: 원인 상위 3개를 줄이는 방법 ── */}
          <div className="mt-6 border-t border-neutral-100 pt-4">
            <h3 className="text-sm font-bold">이렇게 줄여 보세요</h3>
            <p className="mt-1 text-xs text-neutral-500">
              가장 많이 받은 원인 {Math.min(TOP_N, causes.length)}개의 해결 방법이에요.
            </p>
            <ul className="mt-3 grid gap-3">
              {causes.slice(0, TOP_N).map((c, i) => {
                const solutions = SOLUTIONS[c.reasonId] ?? [];
                const tip = bestTips.get(c.reasonId);
                return (
                  <li key={c.reasonId} className="rounded-xl bg-green-50/60 p-3 text-sm">
                    <p className="font-semibold">
                      <span className="mr-1.5 text-xs font-bold text-red-600">{i + 1}위</span>
                      {c.reasonLabel}
                    </p>
                    {solutions.length > 0 && (
                      <ul className="mt-1.5 grid gap-1 text-neutral-700">
                        {solutions.map((s) => (
                          <li key={s} className="flex gap-1.5">
                            <span aria-hidden className="text-green-700">
                              ✓
                            </span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {tip && (
                      <p className="mt-2 rounded-lg bg-white px-2.5 py-2 text-xs text-neutral-600 ring-1 ring-green-100">
                        <b className="text-green-800">친구들의 팁</b> · {tip.body}
                        {tip.votes > 0 && <span className="text-neutral-400"> (도움이 돼요 {tip.votes})</span>}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-neutral-400">
              더 많은 팁은 아래 ‘벌점 줄이기 팁 게시판’에서 볼 수 있어요.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
