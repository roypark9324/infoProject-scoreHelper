# 벌점 관리 도우미

학생이 받은 벌점·상점을 입력하면 현재 누적 점수, 사유별 원인 분석, 월별 추세, 상점으로 상쇄하는 방법을 보여 주는 웹 서비스입니다. (2608 박종현 · 정보과학 프로젝트)

- 배포: https://info-project-score-helper-yw7t.vercel.app/
- 기술: Next.js (App Router) · Tailwind CSS · Supabase (Auth + Postgres) · Vercel

## 실행

```bash
npm install
npm run dev   # http://localhost:3000
```

`.env.local`에 Supabase 값을 넣습니다. (GitHub에 올리지 않습니다. Secret / service_role 키는 쓰지 않습니다.)

```
NEXT_PUBLIC_SUPABASE_URL=<Project URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Publishable key>
```

## DB 준비 (처음 한 번)

1. Supabase 대시보드 → **SQL Editor** → New query
2. `supabase/schema.sql` 전체를 붙여 넣고 **Run**
3. Authentication → Sign In / Providers → **Email** 이 켜져 있는지 확인하고, 학교 서비스라 인증 메일을 보내기 어려우므로 **Confirm email** 을 끕니다. (켜 두면 가입 직후 메일 인증이 필요하고, 기본 메일 발송에는 시간당 횟수 제한이 있습니다.)
4. (예전에 Google로 가입한 계정을 지우려면) Authentication → Users에서 삭제합니다. 사용자를 지우면 그 사람의 기록도 함께 지워집니다.

테이블(`students`, `records`, `merit_activities`)에는 Row Level Security가 켜져 있어 로그인한 본인의 행만 읽고 쓸 수 있습니다.

## 계정

로그인은 이메일/비밀번호입니다. 비밀번호는 Supabase가 암호화해서 보관합니다. 회원가입한 누구나 **같은 기능**을 씁니다. (선생님·관리자 같은 역할은 없습니다)

## 상점 모집 게시판 (누구나 모집 → 다른 사람이 신청 → 모집한 사람이 인정)

1. SQL Editor에서 `supabase/board.sql` 전체를 실행합니다. (`schema.sql`을 먼저 실행한 뒤)
2. 가입한 누구나 모집 글을 올릴 수 있고, **다른 사람**이 올린 글에는 [참여 신청]을 누를 수 있습니다. 내 글에는 신청할 수 없고, 내 신청은 내가 인정할 수 없습니다.
3. 모집한 사람이 [인정]을 누르면 DB 함수(`decide_application`)가 신청한 사람의 `records`에 상점 기록을 자동으로 넣고, 기록 메모에 **누가 상점을 줬는지**(이름·이메일)를 남깁니다. 모집 중인 글은 ‘상쇄 계획’의 활동 후보로도 쓰입니다.
4. (예전 선생님/관리자 기능을 쓰던 DB라면) `tips.sql`까지 실행한 뒤 `supabase/remove-roles.sql`을 한 번 실행해 옛 역할 테이블·함수를 지웁니다.

## 해결 방안과 벌점 줄이기 팁 게시판

- **해결 방안**: ‘원인 분석’ 아래에 가장 많이 받은 원인 상위 3개의 해결 방법이 나옵니다. 사유별 문구는 `lib/tips.ts`의 `SOLUTIONS`에 있고, 학교 규정에 맞게 고치려면 이 목록만 바꾸면 됩니다.
- **팁 게시판**: 사용자가 사유별로 팁을 올리고 [도움이 돼요]를 누릅니다. 글쓴이는 ‘익명 학생’으로 보이고, 내가 쓴 글은 직접 지웁니다. `도움이 돼요`가 가장 많은 팁은 원인 분석 아래에도 ‘친구들의 팁’으로 나옵니다.
- DB 준비: `board.sql`을 실행한 뒤 SQL Editor에서 `supabase/tips.sql` 전체를 실행합니다.

## 배포

GitHub `main`에 push하면 Vercel이 자동 배포합니다. Vercel 프로젝트의 Environment Variables(Production + Preview)에도 위 두 변수를 등록해야 합니다.

## 구조

| 파일 | 역할 |
|------|------|
| `app/page.tsx` | 로그인 잠금(`auth-gate`) + 대시보드 |
| `app/dashboard.tsx` | DB에서 기록을 불러오고 저장·삭제를 처리하는 메인 화면 |
| `app/records-section.tsx` | 기록 입력 폼, 입력값 검사, 기록 목록 |
| `app/cause-analysis.tsx` · `trend-chart.tsx` · `offset-plan.tsx` | 원인 분석 · 월별 추세 · 상쇄 계획 |
| `lib/score.ts` | 누적 점수·위험 단계·원인 분석·추세·상쇄 계획 계산 |
| `lib/records.ts` · `lib/reasons.ts` | 기록 타입·입력값 검사 · 벌점 사유 기준표 |
| `lib/db.ts` | Supabase 저장·불러오기 |
| `lib/supabase.ts` · `lib/auth.ts` | Supabase 연결 · 이메일/비밀번호 로그인·회원가입 |
| `lib/board.ts` · `app/board-section.tsx` | 상점 모집 게시판 (모집 · 신청 · 인정) |
