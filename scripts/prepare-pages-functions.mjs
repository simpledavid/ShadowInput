import { mkdir, readdir, rm, cp } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const openNextDir = join(root, ".open-next");
const outDir = join(root, ".open-next-pages");

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const entries = await readdir(openNextDir, { withFileTypes: true });

for (const entry of entries) {
  const sourcePath = join(openNextDir, entry.name);

  if (entry.name === "worker.js") {
    await cp(sourcePath, join(outDir, "_worker.js"), { force: true });
    continue;
  }

  if (entry.name === "assets") {
    const assetEntries = await readdir(sourcePath, { withFileTypes: true });
    for (const assetEntry of assetEntries) {
      const assetSource = join(sourcePath, assetEntry.name);
      const assetDest = join(outDir, assetEntry.name);
      await cp(assetSource, assetDest, {
        recursive: assetEntry.isDirectory(),
        force: true,
      });
    }
    continue;
  }

  const destPath = join(outDir, entry.name);
  await cp(sourcePath, destPath, {
    recursive: entry.isDirectory(),
    force: true,
  });
}

console.log("Prepared Pages Functions output at .open-next-pages");
