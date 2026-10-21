// Copies the Excalidraw fonts into public/ so the whiteboard loads them from
// our own domain instead of a third-party CDN.
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const clientRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(clientRoot, "node_modules/@excalidraw/excalidraw/dist/prod/fonts");
const target = join(clientRoot, "public/excalidraw-assets/fonts");

if (!existsSync(source)) {
  throw new Error("Excalidraw fonts not found. Run npm install first.");
}

rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
console.log("Copied Excalidraw fonts to public/excalidraw-assets/fonts");
