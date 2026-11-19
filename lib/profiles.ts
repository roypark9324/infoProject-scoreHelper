// 벌점 관리 도우미 - 내 프로필 (이름, 학년, 소개, 프로필 사진)
// 테이블·저장소는 supabase/profiles.sql 참고. 프로필은 나와 수락된 친구만 읽을 수 있다.

import { createClient } from "./supabase";

const BUCKET = "avatars";

export const MAX_NAME_LENGTH = 20;
export const MAX_BIO_LENGTH = 200;
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
export const GRADES = [1, 2, 3] as const;

/** 올릴 수 있는 사진 형식 → 파일 확장자 */
const AVATAR_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const AVATAR_ACCEPT = Object.keys(AVATAR_TYPES).join(",");

export interface Profile {
  userId: string;
  displayName: string;
  /** 1~3, 정하지 않았으면 null */
  grade: number | null;
  bio: string;
  /** 저장소 안의 파일 경로 (없으면 null) */
  avatarPath: string | null;
  /** 화면에 바로 쓸 수 있는 사진 주소 (없으면 null) */
  avatarUrl: string | null;
}

export interface ProfileInput {
  displayName: string;
  grade: number | null;
  bio: string;
  /** 새로 올릴 사진 */
  newAvatar: File | null;
  /** true면 지금 사진을 지운다 (newAvatar가 있으면 무시) */
  removeAvatar: boolean;
}

interface ProfileRow {
  user_id: string;
  display_name: string;
  grade: number | null;
  bio: string;
  avatar_path: string | null;
}

const COLS = "user_id, display_name, grade, bio, avatar_path";

/** 테이블·저장소가 아직 없을 때 등 흔한 실패를 학생이 알아볼 수 있는 문장으로 바꾼다. */
function explain(error: { code?: string; message: string }): Error {
  if (["PGRST205", "PGRST202", "42P01"].includes(error.code ?? "")) {
    return new Error("프로필용 DB가 아직 없습니다. supabase/profiles.sql을 SQL Editor에서 실행하세요.");
  }
  if (error.message.toLowerCase().includes("bucket not found")) {
    return new Error("프로필 사진 저장소가 아직 없습니다. supabase/profiles.sql을 SQL Editor에서 실행하세요.");
  }
  return new Error(error.message);
}

function avatarUrl(path: string | null): string | null {
  if (!path) return null;
  return createClient().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

function fromRow(r: ProfileRow): Profile {
  return {
    userId: r.user_id,
    displayName: r.display_name,
    grade: r.grade,
    bio: r.bio,
    avatarPath: r.avatar_path,
    avatarUrl: avatarUrl(r.avatar_path),
  };
}

/** 사진 파일 검사. 문제가 있으면 안내 문장을, 괜찮으면 null을 돌려준다. */
export function validateAvatar(file: File): string | null {
  if (!(file.type in AVATAR_TYPES)) return "사진은 JPG, PNG, WEBP 파일만 올릴 수 있습니다.";
  if (file.size > MAX_AVATAR_BYTES) return "사진은 2MB 이하만 올릴 수 있습니다.";
  return null;
}

/** 입력값 검사. 저장하기 전에 고쳐야 할 점을 모두 돌려준다. */
export function validateProfile(input: ProfileInput): string[] {
  const found: string[] = [];
  const name = input.displayName.trim();
  if (!name) found.push("이름을 입력하세요.");
  if (name.length > MAX_NAME_LENGTH) found.push(`이름은 ${MAX_NAME_LENGTH}자 이하로 쓰세요.`);
  if (input.grade !== null && !GRADES.some((g) => g === input.grade)) found.push("학년은 1~3학년 중에서 고르세요.");
  if (input.bio.trim().length > MAX_BIO_LENGTH) found.push(`소개는 ${MAX_BIO_LENGTH}자 이하로 쓰세요.`);
  if (input.newAvatar) {
    const problem = validateAvatar(input.newAvatar);
    if (problem) found.push(problem);
  }
  return found;
}

/** 내 프로필. 아직 저장한 적이 없으면 가입할 때 쓴 이름으로 채운 빈 프로필을 돌려준다. */
export async function fetchMyProfile(): Promise<Profile> {
  const supabase = createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("로그인 정보를 확인하지 못했습니다. 다시 로그인하세요.");

  const { data, error } = await supabase.from("user_profiles").select(COLS).eq("user_id", auth.user.id).maybeSingle();
  if (error) throw explain(error);
  if (data) return fromRow(data as ProfileRow);

  const signupName = auth.user.user_metadata?.full_name;
  return {
    userId: auth.user.id,
    displayName: typeof signupName === "string" ? signupName : "",
    grade: null,
    bio: "",
    avatarPath: null,
    avatarUrl: null,
  };
}

/** 나와 수락된 친구의 프로필 (id → 프로필). 프로필을 만들지 않은 사람은 빠진다. */
export async function fetchProfiles(userIds: string[]): Promise<Record<string, Profile>> {
  if (userIds.length === 0) return {};
  const { data, error } = await createClient().from("user_profiles").select(COLS).in("user_id", userIds);
  if (error) throw explain(error);
  const map: Record<string, Profile> = {};
  for (const row of data as ProfileRow[]) map[row.user_id] = fromRow(row);
  return map;
}

/**
 * 프로필 저장. 새 사진을 먼저 올리고, 프로필 행을 저장한 뒤에야 예전 사진을 지운다.
 * (저장이 실패하면 방금 올린 사진을 되돌려서 저장소에 쓰레기 파일이 남지 않게 한다.)
 */
export async function saveProfile(input: ProfileInput, current: Profile): Promise<Profile> {
  const problems = validateProfile(input);
  if (problems.length > 0) throw new Error(problems[0]);

  const supabase = createClient();
  let avatarPath = current.avatarPath;
  let uploadedPath: string | null = null;

  if (input.newAvatar) {
    const ext = AVATAR_TYPES[input.newAvatar.type];
    uploadedPath = `${current.userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(uploadedPath, input.newAvatar, { contentType: input.newAvatar.type, cacheControl: "3600" });
    if (error) throw explain(error);
    avatarPath = uploadedPath;
  } else if (input.removeAvatar) {
    avatarPath = null;
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(
      {
        user_id: current.userId,
        display_name: input.displayName.trim(),
        grade: input.grade,
        bio: input.bio.trim(),
        avatar_path: avatarPath,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select(COLS)
    .single();

  if (error) {
    if (uploadedPath) await supabase.storage.from(BUCKET).remove([uploadedPath]);
    throw explain(error);
  }

  // 사진이 바뀌었거나 지워졌다면 예전 파일을 정리한다. 실패해도 저장은 이미 끝났으므로 무시한다.
  if (current.avatarPath && current.avatarPath !== avatarPath) {
    await supabase.storage.from(BUCKET).remove([current.avatarPath]);
  }
  return fromRow(data as ProfileRow);
}
