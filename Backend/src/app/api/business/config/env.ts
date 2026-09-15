import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  GEMINI_API_KEY: z.string().optional(),
  GOOGLE_PLACES_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("5000"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables configuration:", parsed.error.format());
  // Don't crash in local development, but log the warning
}

export const env = parsed.success ? parsed.data : {
  DATABASE_URL: process.env.DATABASE_URL || "",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY,
  NODE_ENV: (process.env.NODE_ENV as any) || "development",
  PORT: process.env.PORT || "5000",
};

export default env;
