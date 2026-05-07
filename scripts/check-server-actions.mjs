#!/usr/bin/env node
/**
 * Verifica que todo export de função de arquivos "use server" é async.
 * Next.js exige isso em build time; TypeScript não pega.
 *
 * Uso: node scripts/check-server-actions.mjs
 * Saída: exit 0 se tudo ok, exit 1 com lista de violações.
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { fileURLToPath } from "url";

const ROOT = join(fileURLToPath(import.meta.url), "../..");
const SRC = join(ROOT, "src");

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...walk(full));
    } else if (full.endsWith(".ts") || full.endsWith(".tsx")) {
      files.push(full);
    }
  }
  return files;
}

function hasUseServerDirective(content) {
  // The directive must appear before any import or code.
  // Accept it in the first non-empty, non-comment line.
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) continue;
    return t === '"use server";' || t === "'use server';" || t === '"use server"' || t === "'use server'";
  }
  return false;
}

// Matches lines where a non-async function is exported at top level.
// Covers:   export function foo(
//           export function foo<T>(
// Does NOT flag: export async, export type, export interface,
//               export const, export { }, export *
const SYNC_FUNCTION_EXPORT = /^export\s+function\s+\w/;

// Matches: export const foo = (  or  export const foo = function(
// Does NOT flag: export const foo = async
const SYNC_CONST_EXPORT = /^export\s+const\s+\w+\s*=\s*(?!async\b)(?:function\b|\()/;

let violations = 0;

for (const file of walk(SRC)) {
  const content = readFileSync(file, "utf8");
  if (!hasUseServerDirective(content)) continue;

  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (SYNC_FUNCTION_EXPORT.test(line) || SYNC_CONST_EXPORT.test(line)) {
      console.error(`❌  ${relative(ROOT, file)}:${i + 1}`);
      console.error(`    ${line}`);
      violations++;
    }
  }
}

if (violations > 0) {
  console.error(
    `\n${violations} violação(ões) encontrada(s).\n` +
    `Todo export de função em arquivo "use server" deve ser async.\n` +
    `Next.js rejeita o build se não for.`
  );
  process.exit(1);
}

console.log('✅  Todos os exports de arquivos "use server" são async.');
