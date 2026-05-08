import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const packages = ["clientpad-core", "cli", "sdk", "server", "cloud"];

await mkdir(distDir, { recursive: true });

for (const packageName of packages) {
  await packPackage(packageName);
}

function packPackage(packageName) {
  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["pack", "--pack-destination", distDir], {
      cwd: path.join(root, "packages", packageName),
      shell: true,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Packing packages/${packageName} failed with exit code ${code}.`));
    });
  });
}
