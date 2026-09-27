"use client";

// 차시 5: 월별 추세 (IPO의 '처리 4 · 출력 3')
// - 최근 6개월의 월별 벌점 합계를 꺾은선으로 그린다.
// - 이번 달과 지난달을 비교해 늘었는지 줄었는지 문장으로 알려 준다.
// - 점에 마우스를 올리면 그달의 벌점·상점 합계가 보인다.

import { useState } from "react";
import { monthlyTrend } from "@/lib/score";
import type { ScoreRecord } from "@/lib/records";

// 그래프 크기 (SVG 좌표계)
const W = 560;
const H = 200;
const PAD = { top: 20, right: 16, bottom: 28, left: 32 };

export default function TrendChart({ records }: { records: ScoreRecord[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const stats = monthlyTrend(records);

  const hasPenalty = stats.some((s) => s.penaltySum > 0);
  const thisMonth = stats[stats.length - 1];
  const lastMonth = stats[stats.length - 2];
  const diff = thisMonth.penaltySum - lastMonth.penaltySum;

  // y축 최댓값: 5점 단위로 올림 (최소 5)
  const yMax = Math.max(5, Math.ceil(Math.max(...stats.map((s) => s.penaltySum)) / 5) * 5);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (plotW * i) / (stats.length - 1);
  const y = (v: number) => PAD.top + plotH - (plotH * v) / yMax;
  const path = stats.map((s, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(s.penaltySum)}`).join(" ");
  const ticks = [0, yMax / 2, yMax];

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <h2 className="text-sm font-bold">월별 벌점 추세</h2>

      {!hasPenalty ? (
        <p className="mt-3 rounded-xl border border-dashed border-neutral-200 px-3 py-6 text-center text-xs text-neutral-400">
          벌점 기록이 생기면 달마다 늘고 있는지 줄고 있는지 여기에 보여 드려요.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-neutral-600">
            {thisMonth.label} 벌점은 <b className="text-neutral-900">{thisMonth.penaltySum}점</b>으로,
            지난달({lastMonth.label}) {lastMonth.penaltySum}점보다{" "}
            {diff > 0 ? (
              <b className="text-red-700">▲ {diff}점 늘었습니다.</b>
            ) : diff < 0 ? (
              <b className="text-green-700">▼ {-diff}점 줄었습니다.</b>
            ) : (
              <b className="text-neutral-700">변화가 없습니다.</b>
            )}
          </p>

          <div className="relative mt-3">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="h-auto w-full"
              role="img"
              aria-label="최근 6개월 월별 벌점 합계 꺾은선 그래프"
            >
              {/* 가로 눈금선 + y축 숫자 */}
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#e5e5e5" />
                  <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#a3a3a3">
                    {t}
                  </text>
                </g>
              ))}

              {/* 선 */}
              <path d={path} fill="none" stroke="#dc2626" strokeWidth="2" strokeLinejoin="round" />

              {/* 점 + x축 이름 + 마우스 영역 */}
              {stats.map((s, i) => (
                <g key={s.month}>
                  {hover === i && (
                    <line x1={x(i)} x2={x(i)} y1={PAD.top} y2={PAD.top + plotH} stroke="#d4d4d4" strokeDasharray="3 3" />
                  )}
                  <circle cx={x(i)} cy={y(s.penaltySum)} r={hover === i ? 5.5 : 4} fill="#dc2626" stroke="#fff" strokeWidth="2" />
                  <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#737373">
                    {s.label}
                  </text>
                  <rect
                    x={x(i) - plotW / (stats.length - 1) / 2}
                    y={PAD.top}
                    width={plotW / (stats.length - 1)}
                    height={plotH}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  />
                </g>
              ))}

              {/* 이번 달 값은 바로 옆에 숫자로 */}
              <text
                x={x(stats.length - 1)}
                y={y(thisMonth.penaltySum) - 10}
                textAnchor="end"
                fontSize="12"
                fontWeight="700"
                fill="#171717"
              >
                {thisMonth.penaltySum}점
              </text>
            </svg>

            {/* 마우스를 올린 달의 상세 */}
            {hover !== null && (
              <div
                className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg bg-neutral-900 px-2.5 py-1.5 text-xs text-white shadow"
                style={{ left: `${(x(hover) / W) * 100}%` }}
              >
                <div className="font-bold">{stats[hover].label}</div>
                <div>벌점 {stats[hover].penaltySum}점 · 상점 {stats[hover].meritSum}점</div>
              </div>
            )}
          </div>

          {/* 화면 읽기 프로그램용 표 */}
          <table className="sr-only">
            <caption>월별 벌점·상점 합계</caption>
            <thead>
              <tr><th>월</th><th>벌점</th><th>상점</th></tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.month}><td>{s.label}</td><td>{s.penaltySum}</td><td>{s.meritSum}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
