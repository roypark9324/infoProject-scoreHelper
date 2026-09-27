// 차시 5: 상쇄 계획 (IPO의 '입력 3 목표 점수 · 처리 5 · 출력 5')
// - 목표 점수까지 줄여야 할 점수를 구하고, 봉사활동 배점으로 나눠 몇 번 해야 하는지 문장으로 보여 준다.
// - 학교 규정상 감면은 학기당 20점까지라서, 남은 한도보다 많이 필요하면 따로 알려 준다.

import { MERIT_LIMIT_PER_SEMESTER, calcOffsetPlan } from "@/lib/score";

interface Props {
  net: number;
  target: number;
  onTargetChange: (target: number) => void;
  semesterMeritSum: number;
}

export default function OffsetPlan({ net, target, onTargetChange, semesterMeritSum }: Props) {
  const plan = calcOffsetPlan(net, target, semesterMeritSum);
  const [best, ...others] = plan.options;
  const overLimit = plan.need > plan.meritLeft;

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold">상쇄 계획</h2>
        <label className="flex items-center gap-1.5 text-xs text-neutral-500">
          목표 점수
          <input
            type="number"
            min={0}
            max={29}
            step={1}
            value={target}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isInteger(n) && n >= 0 && n <= 29) onTargetChange(n);
            }}
            className="w-14 rounded-md border border-neutral-200 px-2 py-1 text-right text-sm text-neutral-900"
          />
          점
        </label>
      </div>

      {plan.need === 0 ? (
        <p className="mt-3 rounded-xl bg-green-50 px-3 py-3 text-sm text-green-800">
          현재 누적 벌점 {net}점으로 이미 목표({target}점) 이하입니다. 지금처럼 유지하세요!
        </p>
      ) : (
        <>
          <p className="mt-3 rounded-xl bg-blue-50 px-3 py-3 text-sm text-blue-900">
            목표 {target}점까지 <b>{plan.need}점</b>을 줄여야 합니다.{" "}
            <b>
              {best.reason.label} {best.times}회(상점 {best.points}점)
            </b>
            를 하면 목표 점수까지 내려갑니다.
          </p>

          <ul className="mt-3 grid gap-1 text-sm text-neutral-600">
            {others.map((o) => (
              <li key={o.reason.id}>
                · 또는 {o.reason.label} <b className="text-neutral-900">{o.times}회</b>
                <span className="text-neutral-400"> (상점 {o.points}점)</span>
              </li>
            ))}
          </ul>

          {overLimit && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              ⚠ 봉사활동 감면은 학기당 {MERIT_LIMIT_PER_SEMESTER}점까지라서 이번 학기에는{" "}
              {plan.meritLeft}점만 더 줄일 수 있습니다. 새 벌점을 받지 않는 것이 먼저예요.
            </p>
          )}
        </>
      )}
    </section>
  );
}
