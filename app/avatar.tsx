// 프로필 사진 동그라미. 사진이 없으면 이름의 첫 글자를 보여 준다.

export default function Avatar({
  url,
  name,
  size = 40,
}: {
  url: string | null;
  name: string;
  /** 지름(px) */
  size?: number;
}) {
  const style = { width: size, height: size };
  if (url) {
    return (
      // 사진 주소가 Supabase 저장소라서 next/image 설정 없이 일반 img를 쓴다.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={`${name || "사용자"} 프로필 사진`} style={style} className="shrink-0 rounded-full object-cover" />
    );
  }
  return (
    <span
      aria-hidden
      style={{ ...style, fontSize: Math.round(size * 0.42) }}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-neutral-200 font-bold text-neutral-500"
    >
      {name.trim().charAt(0) || "?"}
    </span>
  );
}
