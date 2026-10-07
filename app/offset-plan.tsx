// 차시 5: 상쇄 계획 (IPO의 '입력 3 목표 점수 · 처리 5 · 출력 5')
// - 목표 점수까지 줄여야 할 점수를 구하고, 등록해 둔 모집 활동의 배점으로 나눠
//   어떤 활동을 몇 번 해야 하는지 문장으로 보여 준다.

import { calcOffsetPlan } from "@/lib/score";
import type { MeritActivity } from "@/lib/reasons";

interface Props {
  net: number;
  target: number;
  onTargetChange: (target: number) => void;
  activities: MeritActivity[];
}

export default function OffsetPlan({ net, target, onTargetChange, activities }: Props) {
  const plan = calcOffsetPlan(net, target, activities);
  const [best, ...others] = plan.options;

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
      ) : !best ? (
        <p className="mt-3 rounded-xl bg-neutral-50 px-3 py-3 text-sm text-neutral-600">
          목표 {target}점까지 <b>{plan.need}점</b>을 줄여야 합니다. 선생님이 모집하는 상점 활동을
          &apos;기록 입력 &gt; 상점&apos;에서 등록하면, 어떤 활동을 몇 번 해야 하는지 알려 드려요.
        </p>
      ) : (
        <>
          <p className="mt-3 rounded-xl bg-blue-50 px-3 py-3 text-sm text-blue-900">
            목표 {target}점까지 <b>{plan.need}점</b>을 줄여야 합니다.{" "}
            <b>
              {best.activity.name} {best.times}회(상점 {best.points}점)
            </b>
            를 하면 목표 점수까지 내려갑니다.
          </p>

          <ul className="mt-3 grid gap-1 text-sm text-neutral-600">
            {others.map((o) => (
              <li key={o.activity.id}>
                · 또는 {o.activity.name} <b className="text-neutral-900">{o.times}회</b>
                <span className="text-neutral-400"> (상점 {o.points}점)</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
