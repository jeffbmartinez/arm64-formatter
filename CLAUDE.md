# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

A VS Code extension (`arm64-formatter`) that provides opinionated operand alignment formatting for GNU ARM64/AArch64 assembly. It registers as the formatter for the `arm64-asm` language mode, which is supplied by a separate marketplace extension ([ARM64 Assembly (GNU AS)](https://marketplace.visualstudio.com/items?itemName=Felipenguim.vscode-arm64-assembly)) — this repo does not define that language mode itself.

## Commands

```sh
npm run compile      # tsc build to out/
npm run watch         # tsc -watch
npm run lint           # eslint src
npm run test:unit    # compile, then run the pure-formatter unit tests (node:test)
npm test                # vscode-test: compile+lint (via npm's pretest), then run the extension-host integration test
npm run package     # vsce package -> .vsix
```

Press F5 in VS Code to launch an Extension Development Host using the generated debug configuration.

To run a single unit test by name, compile first, then pass `--test-name-pattern` to node's test runner:

```sh
npm run compile && node --test --test-name-pattern="uses absolute columns" out/test/formatter.unit.test.js
```

Note: npm's automatic `pretest` hook only fires before `npm test` (which runs `vscode-test`), not before `npm run test:unit` — the unit-test script runs its own `compile` step explicitly.

## Architecture

The extension is split into a pure formatting engine and a thin VS Code adapter, so the core logic can be unit-tested without spinning up an Extension Development Host:

- **`src/formatter.ts`** — pure, dependency-free formatting engine (no `vscode` import). Exports `formatDocument` and `formatRange`, both returning `LineEdit[]` (`{ line, text }`), never touching `vscode.TextEdit` directly. Internally:
  - `parseGroups` splits the document into `Group`s at blank lines only. Comment-only, label, and directive lines stay inside the surrounding group without being rewritten themselves.
  - `parseInstruction` classifies each line: a line is an instruction/macro call unless its first token starts with `.` (directive) or ends with `:` (label). It separates trailing `//`/`/* */` comments from code via `findComment`, which tracks quoted-string state so comment markers inside string/char literals aren't treated as comments, and tracks block-comment continuation across lines.
  - `formatGroups` computes one shared operand column and one shared comment column per group (based on the furthest mnemonic end / operand end in that group, rounded up to the `tabSize` boundary), then calls `formatInstruction` per line and emits an edit only for lines whose formatted text actually differs from the source.
  - Tabs in formatted instruction lines are always expanded to spaces, regardless of the editor's `insertSpaces` setting; only the column boundary is derived from `tabSize`.
- **`src/extension.ts`** — the VS Code adapter. Registers `DocumentFormattingEditProvider` and `DocumentRangeFormattingEditProvider` for the `arm64-asm` selector, calling into `formatDocument`/`formatRange` and converting the returned `LineEdit[]` into `vscode.TextEdit[]` via `toTextEdits`. For range formatting, it expands the requested range so a selection touching any part of a group reformats the whole group.
- **`src/test/formatter.unit.test.ts`** — `node:test` unit tests against the pure formatter only (fast, no VS Code dependency); this is what `npm run test:unit` runs.
- **`src/test/extension.test.ts`** — Mocha test run through `@vscode/test-cli`/`@vscode/test-electron` (`npm test`), verifying the extension activates and registers the formatter selector inside a real VS Code instance.
