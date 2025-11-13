#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { put } from "@vercel/blob";
import { normalizeState } from "../api/_lib/store.js";

const STORAGE_KEY = "internship-tracker/state.json";

async function main() {
  const fileArg = process.argv[2] ?? "state.backup.json";
  const filePath = path.resolve(process.cwd(), fileArg);

  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  const normalized = normalizeState(parsed);

  await put(STORAGE_KEY, JSON.stringify(normalized), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });

  console.log(`Restored ${fileArg} to ${STORAGE_KEY}`);
}

main().catch((error) => {
  console.error("Failed to restore blob:", error);
  process.exitCode = 1;
});
