import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Mặc định khớp với docker-compose.yml, để `npm install` chạy được trước khi có tệp .env.
    url: process.env.DATABASE_URL ?? "postgresql://miu:miu@localhost:5432/miu",
  },
});
