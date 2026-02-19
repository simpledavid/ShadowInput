import { mkdir, readdir, rm, cp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const openNextDir = join(root, ".open-next");
const outDir = join(root, ".open-next-pages");

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const entries = await readdir(openNextDir, { withFileTypes: true });

async function patchNodeSqliteRequires(baseDir) {
  const stack = [baseDir];
  let patchedFiles = 0;

  while (stack.length) {
    const currentDir = stack.pop();
    const currentEntries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of currentEntries) {
      const fullPath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith(".mjs")) {
        continue;
      }

      const source = await readFile(fullPath, "utf8");
      if (!source.includes('require("node:sqlite")')) {
        continue;
      }

      const patched = source.replace(
        /([A-Za-z_$][A-Za-z0-9_$]*)\.exports=require\("node:sqlite"\)/g,
        '$1.exports=(()=>{let e=Error("node:sqlite unavailable");e.code="ERR_UNKNOWN_BUILTIN_MODULE";throw e})()'
      );

      if (patched !== source) {
        await writeFile(fullPath, patched, "utf8");
        patchedFiles += 1;
      }
    }
  }

  if (patchedFiles > 0) {
    console.log(`Patched node:sqlite imports in ${patchedFiles} file(s)`);
  }
}

async function patchWorkerStaticAssetFallback(baseDir) {
  const workerPath = join(baseDir, "_worker.js");
  let source;
  try {
    source = await readFile(workerPath, "utf8");
  } catch {
    return;
  }

  if (source.includes("ShadowInput static asset fallback")) {
    return;
  }

  const needle = "const url = new URL(request.url);";
  if (!source.includes(needle)) {
    return;
  }

  const fallbackCode = `${needle}
            // ShadowInput static asset fallback:
            // ensure _next/css/js and downloadable files are served from ASSETS.
            if (env.ASSETS && (request.method === "GET" || request.method === "HEAD")) {
                const staticAssetPath = url.pathname.startsWith("/_next/") ||
                    /\\.(?:css|js|mjs|map|ico|svg|png|jpg|jpeg|gif|webp|avif|txt|xml|json|woff2?|ttf|eot|zip)$/i.test(url.pathname);
                if (staticAssetPath) {
                    const assetResp = await env.ASSETS.fetch(request);
                    if (assetResp && assetResp.status !== 404) {
                        return assetResp;
                    }
                }
            }`;

  const patched = source.replace(needle, fallbackCode);
  if (patched !== source) {
    await writeFile(workerPath, patched, "utf8");
    console.log("Patched _worker.js with static asset fallback");
  }
}

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

await patchNodeSqliteRequires(outDir);
await patchWorkerStaticAssetFallback(outDir);

console.log("Prepared Pages Functions output at .open-next-pages");
