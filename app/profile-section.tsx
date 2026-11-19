"use client";

// 내 프로필: 이름, 학년, 소개, 프로필 사진을 보고 고친다.
// 수락된 친구에게는 이 프로필이 친구 목록과 순위표에 보인다. DB는 supabase/profiles.sql.

import { useEffect, useState } from "react";
import {
  AVATAR_ACCEPT,
  GRADES,
  MAX_BIO_LENGTH,
  MAX_NAME_LENGTH,
  fetchMyProfile,
  saveProfile,
  validateAvatar,
  validateProfile,
  type Profile,
} from "@/lib/profiles";
import Avatar from "./avatar";

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
}

export default function ProfileSection() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMyProfile()
      .then((p) => !cancelled && setProfile(p))
      .catch((e) => !cancelled && setError(errorMessage(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-label="내 프로필" className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      {error && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {!profile && !error && <p className="text-xs text-neutral-400">프로필을 불러오는 중…</p>}

      {profile && !editing && (
        <div className="flex items-start gap-4">
          <Avatar url={profile.avatarUrl} name={profile.displayName} size={64} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold">
              {profile.displayName || "이름을 정해 주세요"}
              {profile.grade && (
                <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-500">
                  {profile.grade}학년
                </span>
              )}
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-neutral-600">
              {profile.bio || "한 줄 소개를 적어 보세요."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-50"
          >
            프로필 편집
          </button>
        </div>
      )}

      {profile && editing && (
        <ProfileForm
          profile={profile}
          onSaved={(p) => {
            setProfile(p);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      )}
    </section>
  );
}

function ProfileForm({
  profile,
  onSaved,
  onCancel,
}: {
  profile: Profile;
  onSaved: (p: Profile) => void;
  onCancel: () => void;
}) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [grade, setGrade] = useState<number | null>(profile.grade);
  const [bio, setBio] = useState(profile.bio);
  const [newAvatar, setNewAvatar] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // 고른 사진을 저장하기 전에 미리 보여 준다. 쓰고 나면 주소를 풀어 메모리를 돌려준다.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = ""; // 같은 파일을 다시 골라도 반응하도록 비워 둔다.
    if (!file) return;
    const problem = validateAvatar(file);
    if (problem) {
      setErrors([problem]);
      return;
    }
    setErrors([]);
    setNewAvatar(file);
    setPreviewUrl(URL.createObjectURL(file));
    setRemoveAvatar(false);
  }

  function dropPickedAvatar() {
    setNewAvatar(null);
    setPreviewUrl(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = { displayName, grade, bio, newAvatar, removeAvatar };
    const problems = validateProfile(input);
    setErrors(problems);
    if (problems.length > 0) return;

    setSaving(true);
    try {
      onSaved(await saveProfile(input, profile));
    } catch (err) {
      setErrors([errorMessage(err)]);
      setSaving(false);
    }
  }

  const shownUrl = previewUrl ?? (removeAvatar ? null : profile.avatarUrl);
  const hasAvatar = Boolean(shownUrl);

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <h2 className="text-sm font-bold">프로필 편집</h2>

      {errors.length > 0 && (
        <ul role="alert" className="list-disc rounded-lg bg-red-50 py-2 pl-7 pr-3 text-sm text-red-700">
          {errors.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}

      {/* 사진 */}
      <div className="flex items-center gap-4">
        <Avatar url={shownUrl} name={displayName} size={72} />
        <div className="grid gap-1.5">
          <label className="inline-block cursor-pointer rounded-lg px-3 py-1.5 text-center text-xs font-semibold text-neutral-700 ring-1 ring-neutral-200 hover:bg-neutral-50">
            사진 고르기
            <input type="file" accept={AVATAR_ACCEPT} onChange={handleFile} className="sr-only" />
          </label>
          {hasAvatar && (
            <button
              type="button"
              onClick={() => {
                dropPickedAvatar();
                setRemoveAvatar(true);
              }}
              className="text-xs text-neutral-400 underline hover:text-red-600"
            >
              사진 지우기
            </button>
          )}
          <p className="text-xs text-neutral-400">JPG·PNG·WEBP, 2MB 이하</p>
        </div>
      </div>

      {/* 이름 */}
      <label className="grid gap-1 text-sm">
        <span className="font-semibold">이름</span>
        <input
          type="text"
          value={displayName}
          maxLength={MAX_NAME_LENGTH}
          onChange={(e) => setDisplayName(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2"
        />
      </label>

      {/* 학년 */}
      <label className="grid gap-1 text-sm">
        <span className="font-semibold">학년</span>
        <select
          value={grade ?? ""}
          onChange={(e) => setGrade(e.target.value === "" ? null : Number(e.target.value))}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2"
        >
          <option value="">선택 안 함</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>
              {g}학년
            </option>
          ))}
        </select>
      </label>

      {/* 소개 */}
      <label className="grid gap-1 text-sm">
        <span className="font-semibold">소개</span>
        <textarea
          value={bio}
          maxLength={MAX_BIO_LENGTH}
          rows={3}
          onChange={(e) => setBio(e.target.value)}
          placeholder="나를 한두 문장으로 소개해 보세요."
          className="resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2"
        />
        <span className="text-right text-xs text-neutral-400">
          {bio.length}/{MAX_BIO_LENGTH}
        </span>
      </label>

      <p className="text-xs text-neutral-400">
        프로필은 나와 <b>수락된 친구</b>에게만 보여요. (프로필 사진 파일은 주소를 아는 사람이면 열 수 있어요.)
      </p>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-neutral-500 ring-1 ring-neutral-200 hover:bg-neutral-50 disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {saving ? "저장하는 중…" : "저장하기"}
        </button>
      </div>
    </form>
  );
}
