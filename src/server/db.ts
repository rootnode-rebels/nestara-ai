/**
 * Nestara AI — Dual-Mode Database Adapter
 * Seamlessly interfaces with local Cloudflare D1 (SQLite) during local iterations,
 * and routes to PostgreSQL (Supabase / Neon) when DATABASE_URL is provisioned.
 */

import { initDB as initClawnifyDB, query as clawnifyQuery, get as clawnifyGet, run as clawnifyRun } from "@clawnify/db";

export type DatabaseDriverType = "d1-sqlite" | "postgresql";

let currentDriver: DatabaseDriverType = "d1-sqlite";

export function getDatabaseMode(): DatabaseDriverType {
  return currentDriver;
}

export function initDB(env: any) {
  const globalProc = typeof globalThis !== "undefined" ? (globalThis as any).process : undefined;
  if (env?.DATABASE_URL || globalProc?.env?.DATABASE_URL) {
    currentDriver = "postgresql";
  } else {
    currentDriver = "d1-sqlite";
  }
  return initClawnifyDB(env);
}

export const query = clawnifyQuery;
export const get = clawnifyGet;
export const run = clawnifyRun;
