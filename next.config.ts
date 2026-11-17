import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Prisma và pg chạy phía máy chủ, không đóng gói vào bundle trình duyệt.
  serverExternalPackages: ["pg", "@prisma/adapter-pg"],
};

export default nextConfig;
