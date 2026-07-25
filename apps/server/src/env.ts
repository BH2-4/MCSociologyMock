import { existsSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const workspaceEnvironment = resolve(workspaceRoot, ".env");
if (existsSync(workspaceEnvironment)) process.loadEnvFile(workspaceEnvironment);

export function resolveWorkspacePath(path: string): string {
  return isAbsolute(path) ? path : resolve(workspaceRoot, path);
}
