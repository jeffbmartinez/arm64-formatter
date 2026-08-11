# ARM64 Assembly Formatter

An opinionated formatter for GNU ARM64/AArch64 assembly in VS Code. It supports the `arm64-asm` language mode from [ARM64 Assembly (GNU AS)](https://marketplace.visualstudio.com/items?itemName=Felipenguim.vscode-arm64-assembly).

## What it formats

The formatter aligns instruction and macro-call operands within each nonblank group. It leaves labels, directives, and comment-only lines unchanged, but they remain part of their surrounding group.

```asm
// Demonstrate the not instruction
lea x0, leftOp
ldr x1, [x0]
mvn w1, w1 // Use 32-bit register
```

becomes:

```asm
// Demonstrate the not instruction
lea   x0, leftOp
ldr   x1, [x0]
mvn   w1, w1    // Use 32-bit register
```

Operand and inline-comment columns use the editor’s configured tab size, but formatted instruction lines always contain spaces. A minimum of two spaces separates a mnemonic, operands, and a trailing comment.

## Use

Install this extension and [ARM64 Assembly (GNU AS)](https://marketplace.visualstudio.com/items?itemName=Felipenguim.vscode-arm64-assembly). Open a `.s` or `.S` file recognized as `arm64-asm`, then use **Format Document** or **Format Selection**. Format-on-save works through VS Code’s normal `editor.formatOnSave` setting.

If VS Code asks for a formatter, choose **ARM64 Assembly Formatter**.

## Development

```sh
npm install
npm test
npm run package
```

`npm run test:integration` runs the formatter-registration smoke test in a VS Code extension host.

## License

[MIT](LICENSE)
