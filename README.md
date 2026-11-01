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
3. Authentication → Sign In / Providers → **Google** 켜기, URL Configuration에 배포 주소와 `http://localhost:3000` 등록

테이블(`students`, `records`, `merit_activities`)에는 Row Level Security가 켜져 있어 로그인한 본인의 행만 읽고 쓸 수 있습니다.

## 상점 모집 게시판 (선생님이 모집 → 학생 신청 → 선생님 인정)

1. SQL Editor에서 `supabase/board.sql` 전체를 실행합니다. (`schema.sql`을 먼저 실행한 뒤)
2. 선생님 Google 이메일을 등록합니다. 소문자로 넣으세요. 이 목록은 브라우저에서 읽거나 고칠 수 없고, 대시보드에서만 관리합니다.
   ```sql
   insert into public.teachers (email) values ('teacher@example.com') on conflict do nothing;
   ```
3. 등록된 이메일로 로그인하면 게시판에 “선생님” 표시와 모집 글 작성 칸이 나타납니다. 그 외 계정은 학생 화면(신청만 가능)입니다.
4. 선생님이 [인정]을 누르면 DB 함수(`decide_application`)가 그 학생의 `records`에 상점 기록을 자동으로 넣습니다. 모집 중인 글은 ‘상쇄 계획’의 활동 후보로도 쓰입니다.

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
| `lib/supabase.ts` · `lib/auth.ts` | Supabase 연결 · Google 로그인 |
