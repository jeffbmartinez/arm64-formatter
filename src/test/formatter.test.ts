import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { formatDocument, formatRange, type LineEdit } from "../formatter";

const fixture = (name: string) => readFileSync(resolve(process.cwd(), "src/test/fixtures", name), "utf8");

function applyEdits(source: string, edits: readonly LineEdit[]): string {
  const lines = source.split(/\r\n|\n|\r/);
  for (const edit of edits) lines[edit.line] = edit.text;
  const lineEnding = source.includes("\r\n") ? "\r\n" : "\n";
  return lines.join(lineEnding);
}

test("formats the supplied two-group example at tab size 2", () => {
  const source = fixture("example.input.s");
  const expected = fixture("example.expected.s");
  assert.equal(applyEdits(source, formatDocument(source, { tabSize: 2 })), expected);
});

test("uses the configured tab size and absolute indentation columns", () => {
  const source = "  add x0, x1\n  longest x0, x1\n";
  assert.equal(
    applyEdits(source, formatDocument(source, { tabSize: 4 })),
    "  add       x0, x1\n  longest   x0, x1\n",
  );
});

test("formats macro calls and emits spaces even with tabs in instruction lines", () => {
  const source = "\tvparm2\tleftOp\n\tadd\tx0, x1\n";
  const output = applyEdits(source, formatDocument(source, { tabSize: 2 }));
  assert.equal(output, "  vparm2  leftOp\n  add     x0, x1\n");
  assert.equal(output.includes("\t"), false);
});

test("keeps directives, labels, and comment-only lines verbatim without breaking groups", () => {
  const source = ".text\nstart:\n  add x0, x1\n// note\n  longest x0, x1\n";
  assert.equal(
    applyEdits(source, formatDocument(source, { tabSize: 2 })),
    ".text\nstart:\n  add       x0, x1\n// note\n  longest   x0, x1\n",
  );
});

test("recognizes comments without interpreting markers inside literals", () => {
  const source = "  .ascii \"@ // /*\"\n  mov x0, '@' @ trailing\n  ldr x1, =\"//\" // line\n/*\n  add x0, x1\n*/\n  add x0, x1\n  long x0, x1\n";
  const output = applyEdits(source, formatDocument(source, { tabSize: 2 }));
  assert.equal(output, "  .ascii \"@ // /*\"\n  mov   x0, '@'    @ trailing\n  ldr   x1, =\"//\"  // line\n/*\n  add x0, x1\n*/\n  add   x0, x1\n  long  x0, x1\n");
});

test("preserves CRLF and final-newline state", () => {
  const source = "add x0, x1\r\nlong x0, x1";
  assert.equal(applyEdits(source, formatDocument(source, { tabSize: 2 })), "add   x0, x1\r\nlong  x0, x1");
});

test("expands selection to its complete group, including a comment-only line", () => {
  const source = "add x0, x1\n// note\nlong x0, x1\n\nsub x0, x1\nlong x0, x1\n";
  assert.deepEqual(formatRange(source, { tabSize: 2 }, 1, 1), [
    { line: 0, text: "add   x0, x1" },
    { line: 2, text: "long  x0, x1" },
  ]);
});

test("returns no edits for formatted source and edits only changed lines", () => {
  const formatted = "add   x0, x1\nlong  x0, x1\n";
  assert.deepEqual(formatDocument(formatted, { tabSize: 2 }), []);
  assert.deepEqual(formatDocument("add x0, x1\nlong  x0, x1\n", { tabSize: 2 }), [
    { line: 0, text: "add   x0, x1" },
  ]);
});
