// Build step for the collect-home Vercel project. After `npm run build`
// produces both entries, swap the built homepage into dist/index.html so the
// project root serves the homepage. The app entry keeps serving the app on
// the main collect project; nothing here touches the app's own output.
import { readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const appEntry = resolve(dist, "index.html");
const homeEntry = resolve(dist, "homepage.html");

if (!existsSync(homeEntry)) {
  throw new Error("dist/homepage.html missing — did vite build both entries?");
}
writeFileSync(appEntry, readFileSync(homeEntry));
rmSync(homeEntry);
console.log("standalone-homepage: dist/index.html now serves the homepage.");
