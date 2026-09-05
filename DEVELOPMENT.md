# Development

Notes for working on this extension. This file is for contributors, not extension users — it isn't packaged into the `.vsix` (see `.vscodeignore`).

## Setup

```sh
npm install
```

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

## Publishing

```sh
npm run package        # builds and verifies the .vsix locally
npx vsce ls              # sanity-check which files would be packaged
npx vsce publish        # publish to the Marketplace (requires `vsce login <publisher>` first)
```

Before publishing, sanity-check the actual packaged `.vsix` (not just the F5 dev host, which runs from source):

```sh
code --install-extension arm64-formatter-*.vsix
```

Then open an `arm64-asm` document and confirm formatting still works. Note: a sideloaded `.vsix` has no Marketplace gallery metadata, so its Extensions-view details page shows the raw publisher ID (`jeffbmartinez`) rather than the publisher display name — that's expected and only resolves for extensions installed from the Marketplace itself.

See [CLAUDE.md](CLAUDE.md) for architecture notes.
