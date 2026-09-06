import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 상위 폴더에 있는 다른 package-lock.json을 무시하고 이 폴더를 기준으로 빌드
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
