// vitest.setup.ts
import dotenv from "dotenv";

// Load environment variables for testing (falling back to .env if .env.test doesn't exist)
dotenv.config({ path: ".env.test" });
dotenv.config({ path: ".env" });