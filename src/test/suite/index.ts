import * as path from "node:path";
import Mocha = require("mocha");
import { glob } from "glob";

export function run(): Promise<void> {
  const mocha = new Mocha({ ui: "tdd", color: true });
  const testsRoot = path.resolve(__dirname);
  return new Promise((resolve, reject) => {
    glob("**/*.test.js", { cwd: testsRoot }).then((files) => {
      for (const file of files) mocha.addFile(path.resolve(testsRoot, file));
      try {
        mocha.run((failures: number) => failures === 0 ? resolve() : reject(new Error(`${failures} integration tests failed.`)));
      } catch (error) {
        reject(error);
      }
    }, reject);
  });
}
