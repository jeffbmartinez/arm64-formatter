import { runTests } from "@vscode/test-electron";
import { resolve } from "node:path";

async function main(): Promise<void> {
  const extensionDevelopmentPath = resolve(__dirname, "../..");
  const extensionTestsPath = resolve(__dirname, "suite/index");
  await runTests({ extensionDevelopmentPath, extensionTestsPath });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
