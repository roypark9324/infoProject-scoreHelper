// 벌점 관리 도우미 - dshs.app 상·벌점 내역 가져오기 (탐구 일지 5회 피드백 3번)
//
// dshs.app 로그인(OIDC)에는 벌점 읽기 권한(penalty.read)이 있지만, 앱을 등록해 client_id를 받아야 쓸 수 있다.
// 그 전까지는 학생이 dshs.app의 상·벌점 화면을 복사해 붙여 넣으면 한 번에 기록으로 바꿔 준다.
// 비밀번호나 로그인 정보는 다루지 않는다. 붙여 넣은 글자만 이 브라우저에서 읽는다.
//
// dshs.app 안내문(docs.dshs.app)에 따르면 점수가 양수면 벌점, 음수면 상점(감면)이다.
// 화면 형식을 정확히 몰라도 되도록 한 줄에서 [날짜] [사유] [점수]를 찾는 방식으로 만들었다.
//   예) "2026.11.03  호실 불청결  +0.5"   "2026-11-05 도서관 정리 돕기 -2"   "11/7 무단 외출 5점"

import { REASONS } from "./reasons";
import type { ReasonKind } from "./reasons";
import type { ScoreRecord } from "./records";

export type ImportStatus = "new" | "duplicate" | "invalid";

export interface ImportRow {
  /** 붙여 넣은 글에서 몇 번째 줄인지 (1부터) */
  line: number;
  raw: string;
  status: ImportStatus;
  /** invalid일 때 이유 */
  message?: string;
  date: string;
  kind: ReasonKind;
  reasonId: string;
  reasonLabel: string;
  points: number;
}

const DATE_FULL = /(\d{4})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})\s*일?/;
// 연도 없는 날짜는 '/'나 '월'이 있을 때만 날짜로 본다. (1.5점 같은 소수와 헷갈리지 않게)
const DATE_SHORT = /(?<!\d)(\d{1,2})\s*(?:\/|월)\s*(\d{1,2})\s*일?(?!\d)/;
const POINT = /([+\-−–]?)\s*(\d+(?:\.\d+)?)\s*(점?)/g;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** 실제 있는 날짜인지 확인하고 YYYY-MM-DD로 돌려준다. 없는 날짜면 null. */
function toISO(y: number, m: number, d: number): string | null {
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

function norm(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

/** 줄 하나에서 날짜를 찾아 (날짜, 날짜를 뺀 나머지 글)로 돌려준다. */
function takeDate(line: string, today: string): { date: string | null; rest: string; found: boolean } {
  const full = DATE_FULL.exec(line);
  if (full) {
    const iso = toISO(Number(full[1]), Number(full[2]), Number(full[3]));
    return { date: iso, rest: line.replace(full[0], " "), found: true };
  }
  const short = DATE_SHORT.exec(line);
  if (short) {
    const month = Number(short[1]);
    const day = Number(short[2]);
    const year = Number(today.slice(0, 4));
    // 올해로 만들었을 때 미래면 작년 날짜로 본다.
    let iso = toISO(year, month, day);
    if (iso && iso > today) iso = toISO(year - 1, month, day);
    return { date: iso, rest: line.replace(short[0], " "), found: true };
  }
  return { date: null, rest: line, found: false };
}

/** 점수 후보 중 부호가 있거나 '점'이 붙은 것을 우선해 하나 고른다. */
function takePoints(text: string): { sign: "+" | "-" | ""; value: number; rest: string } | null {
  let best: { score: number; start: number; end: number; sign: "+" | "-" | ""; value: number } | null = null;
  for (const m of text.matchAll(POINT)) {
    const sign = m[1] === "+" ? "+" : m[1] === "" ? "" : "-";
    const score = (sign ? 3 : 0) + (m[3] ? 2 : 0) + 1;
    const start = m.index ?? 0;
    if (!best || score >= best.score) {
      best = { score, start, end: start + m[0].length, sign, value: Number(m[2]) };
    }
  }
  if (!best) return null;
  return { sign: best.sign, value: best.value, rest: text.slice(0, best.start) + " " + text.slice(best.end) };
}

function findReason(label: string): { id: string; label: string } {
  const n = norm(label);
  if (n.length >= 2) {
    const hit = REASONS.find((r) => norm(r.label).includes(n) || n.includes(norm(r.label)));
    if (hit) return { id: hit.id, label: hit.label };
  }
  // 우리 기준표에 없는 사유는 이름으로 새 id를 만든다. (같은 사유끼리 원인 분석에서 묶이도록 이름 기준)
  return { id: `dshs:${n.slice(0, 50)}`, label: label.slice(0, 80) };
}

/** 붙여 넣은 글 전체를 줄 단위로 읽는다. 날짜도 점수도 없는 줄(제목 줄 등)은 건너뛴다. */
export function parseDshsText(text: string, existing: ScoreRecord[], today: string): ImportRow[] {
  // 이미 있는 기록(같은 날짜·구분·사유·점수)을 세어 두고, 붙여 넣은 줄과 하나씩 맞춰 본다.
  const have = new Map<string, number>();
  for (const r of existing) {
    const key = `${r.date}|${r.kind}|${norm(r.reasonLabel)}|${r.points}`;
    have.set(key, (have.get(key) ?? 0) + 1);
  }

  const rows: ImportRow[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    if (/합계|총\s*계|소계|누적/.test(line)) return; // 합계 줄은 기록이 아니다

    const d = takeDate(line, today);
    const p = takePoints(d.rest);
    if (!d.found && !p) return; // 제목 줄 등

    const base = { line: i + 1, raw: line, date: d.date ?? "", kind: "penalty" as ReasonKind, reasonId: "", reasonLabel: "", points: 0 };
    const invalid = (message: string): void => {
      rows.push({ ...base, status: "invalid", message });
    };

    if (!d.found) return invalid("날짜를 찾지 못했어요.");
    if (!d.date) return invalid("없는 날짜예요.");
    if (d.date > today) return invalid("미래 날짜예요.");
    if (!p) return invalid("점수를 찾지 못했어요.");
    if (p.value <= 0) return invalid("점수는 0보다 커야 해요.");
    if (!Number.isInteger(p.value * 2)) return invalid("점수는 0.5점 단위여야 해요.");

    const hasMerit = /상점|감면/.test(line);
    const hasPenalty = /벌점/.test(line);
    const kind: ReasonKind = hasMerit && !hasPenalty ? "merit" : hasPenalty && !hasMerit ? "penalty" : p.sign === "-" ? "merit" : "penalty";

    const label = p.rest
      .replace(/벌점|상점|감면|\(.*?\)|\[.*?\]/g, " ")
      .replace(/[|,;\t·•:]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!label) return invalid("사유를 찾지 못했어요.");

    const reason = findReason(label);
    const key = `${d.date}|${kind}|${norm(reason.label)}|${p.value}`;
    const left = have.get(key) ?? 0;
    const status: ImportStatus = left > 0 ? "duplicate" : "new";
    if (left > 0) have.set(key, left - 1);

    rows.push({ ...base, status, date: d.date, kind, reasonId: reason.id, reasonLabel: reason.label, points: p.value });
  });
  return rows;
}

/** 분석 결과 한 줄을 저장용 기록으로 바꾼다. */
export function importRowToRecord(row: ImportRow): ScoreRecord {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now() + Math.random()),
    date: row.date,
    kind: row.kind,
    reasonId: row.reasonId,
    reasonLabel: row.reasonLabel,
    points: row.points,
    memo: "dshs.app에서 가져옴",
    createdAt: Date.now(),
  };
}
