// 벌점 관리 도우미 - DB 저장·불러오기 (차시 7·8)
// 기록·모집 활동·목표 점수를 Supabase에 저장하고 읽어 온다.
// 테이블은 supabase/schema.sql 참고. RLS가 켜져 있어 로그인한 본인의 행만 오가므로
// user_id는 보내지 않는다. (DB가 auth.uid()로 채운다.)

import type { MeritActivity, ReasonKind } from "./reasons";
import type { ScoreRecord } from "./records";
import { createClient } from "./supabase";

const DEFAULT_TARGET = 10;

interface RecordRow {
  id: string;
  record_date: string;
  kind: ReasonKind;
  reason_id: string;
  reason_label: string;
  points: number;
  memo: string;
  created_at: string;
}

interface ActivityRow {
  id: string;
  name: string;
  points: number;
}

/** 테이블이 없을 때 등 흔한 실패를 학생이 알아볼 수 있는 문장으로 바꾼다. */
function explain(error: { code?: string; message: string }): Error {
  if (error.code === "PGRST205" || error.code === "42P01") {
    return new Error("DB 테이블이 아직 없습니다. supabase/schema.sql을 SQL Editor에서 실행하세요.");
  }
  return new Error(error.message);
}

function toRecord(row: RecordRow): ScoreRecord {
  return {
    id: row.id,
    date: row.record_date,
    kind: row.kind,
    reasonId: row.reason_id,
    reasonLabel: row.reason_label,
    points: Number(row.points),
    memo: row.memo,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function toActivity(row: ActivityRow): MeritActivity {
  return { id: row.id, name: row.name, points: Number(row.points) };
}

// ── 기록 ───────────────────────────────────────────────

/** 저장된 기록 전부를 최신순(날짜 → 입력 시각)으로 불러온다. */
export async function fetchRecords(): Promise<ScoreRecord[]> {
  const { data, error } = await createClient()
    .from("records")
    .select("id, record_date, kind, reason_id, reason_label, points, memo, created_at")
    .order("record_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw explain(error);
  return (data as RecordRow[]).map(toRecord);
}

/** 기록 1건을 저장하고, DB가 정해 준 id가 담긴 기록을 돌려준다. */
export async function insertRecord(record: ScoreRecord): Promise<ScoreRecord> {
  const { data, error } = await createClient()
    .from("records")
    .insert({
      record_date: record.date,
      kind: record.kind,
      reason_id: record.reasonId,
      reason_label: record.reasonLabel,
      points: record.points,
      memo: record.memo,
    })
    .select("id, record_date, kind, reason_id, reason_label, points, memo, created_at")
    .single();
  if (error) throw explain(error);
  return toRecord(data as RecordRow);
}

export async function deleteRecord(id: string): Promise<void> {
  const { error } = await createClient().from("records").delete().eq("id", id);
  if (error) throw explain(error);
}

// ── 모집 활동 ──────────────────────────────────────────

export async function fetchActivities(): Promise<MeritActivity[]> {
  const { data, error } = await createClient()
    .from("merit_activities")
    .select("id, name, points")
    .order("created_at", { ascending: true });
  if (error) throw explain(error);
  return (data as ActivityRow[]).map(toActivity);
}

export async function insertActivity(activity: MeritActivity): Promise<MeritActivity> {
  const { data, error } = await createClient()
    .from("merit_activities")
    .insert({ name: activity.name, points: activity.points })
    .select("id, name, points")
    .single();
  if (error) throw explain(error);
  return toActivity(data as ActivityRow);
}

export async function deleteActivity(id: string): Promise<void> {
  const { error } = await createClient().from("merit_activities").delete().eq("id", id);
  if (error) throw explain(error);
}

// ── 목표 점수 ──────────────────────────────────────────

/** 저장된 목표 점수. 아직 저장한 적이 없으면 기본값. */
export async function fetchTarget(): Promise<number> {
  const { data, error } = await createClient()
    .from("students")
    .select("target_score")
    .maybeSingle();
  if (error) throw explain(error);
  return data?.target_score ?? DEFAULT_TARGET;
}

export async function saveTarget(target: number): Promise<void> {
  const { error } = await createClient()
    .from("students")
    .upsert({ target_score: target, updated_at: new Date().toISOString() });
  if (error) throw explain(error);
}
