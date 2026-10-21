import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { translations } from "./translations.js";

const sourceRoot = join(import.meta.dirname, "..");

function sourceFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(jsx?|tsx?)$/.test(entry) && !/\.test\./.test(entry) ? [path] : [];
  });
}

function usedKeys() {
  const keys = new Set();
  for (const file of sourceFiles(sourceRoot)) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/\bt\(\s*"([\w.]+)"/g)) keys.add(match[1]);
    for (const match of source.matchAll(/labelKey: "([\w.]+)"/g)) keys.add(match[1]);
  }
  return [...keys];
}

describe("translations", () => {
  it("defines every English key in German as well", () => {
    const missing = Object.keys(translations.en).filter((key) => !(key in translations.de));
    expect(missing).toEqual([]);
  });

  it("defines every German key in English as well", () => {
    const missing = Object.keys(translations.de).filter((key) => !(key in translations.en));
    expect(missing).toEqual([]);
  });

  it("defines every key used in the source code", () => {
    const keys = usedKeys();
    const missing = keys.filter((key) => !(key in translations.en) || !(key in translations.de));
    expect(keys.length).toBeGreaterThan(300);
    expect(missing).toEqual([]);
  });

  it("covers dynamic status, priority, recurrence and role keys", () => {
    const dynamicKeys = [
      ...["TODO", "IN_PROGRESS", "DONE"].map((status) => `task.status.${status}`),
      ...["LOW", "MEDIUM", "HIGH"].map((priority) => `task.priority.${priority}`),
      ...["NONE", "DAILY", "WEEKLY", "MONTHLY"].map((recurrence) => `task.recurrence.${recurrence}`),
      ...["OWNER", "ADMIN", "MEMBER", "VIEWER"].map((role) => `role.${role}`),
    ];
    const missing = dynamicKeys.filter((key) => !(key in translations.de));
    expect(missing).toEqual([]);
  });
});
