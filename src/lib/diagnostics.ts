import packageInfo from "../../package.json" with { type: "json" };

const version = packageInfo.version;

const KEY = "doroboty.diagnostics.v1";
const LIMIT = 20;
const codes = [
  "storage-read",
  "storage-write",
  "storage-conflict",
  "invalid-import",
  "render-error",
  "uncaught-error",
  "unhandled-rejection",
] as const;
export type DiagnosticCode = (typeof codes)[number];
type Entry = { at: string; code: DiagnosticCode; version: string };
let memory: Entry[] = [];

function valid(value: unknown): value is Entry {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Entry>;
  return (
    typeof item.at === "string" &&
    !Number.isNaN(Date.parse(item.at)) &&
    codes.some((code) => code === item.code) &&
    item.version === version
  );
}

export function readDiagnostics(): Entry[] {
  if (memory.length) return memory;
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(stored) ? stored.filter(valid).slice(-LIMIT) : [];
  } catch {
    return memory;
  }
}

export function recordDiagnostic(code: DiagnosticCode): void {
  const next = [...readDiagnostics(), { at: new Date().toISOString(), code, version }].slice(
    -LIMIT,
  );
  memory = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // The in-memory report stays downloadable when localStorage is unavailable.
  }
}

export function downloadDiagnostics(): void {
  const text = JSON.stringify({ version, entries: readDiagnostics() }, null, 2);
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "doroboty-raport-techniczny.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function installGlobalDiagnostics(): void {
  window.addEventListener("error", () => recordDiagnostic("uncaught-error"));
  window.addEventListener("unhandledrejection", () => recordDiagnostic("unhandled-rejection"));
}
