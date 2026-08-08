import { Client } from "@upstash/qstash";

if (!process.env.QSTASH_TOKEN) {
  throw new Error("Missing QSTASH_TOKEN environment variable");
}

export const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN,
});