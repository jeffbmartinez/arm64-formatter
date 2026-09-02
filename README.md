# ARM64 Assembly Formatter

Opinionated operand alignment for GNU ARM64/AArch64 assembly in VS Code. The formatter supports the `arm64-asm` language mode supplied by [ARM64 Assembly (GNU AS)](https://marketplace.visualstudio.com/items?itemName=Felipenguim.vscode-arm64-assembly).

## Features

Instruction and macro-call operands are aligned within each nonblank group. Labels, directives, and comment-only lines remain unchanged, while still participating in the surrounding group.

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

The operand column follows the editor’s `tabSize`, but formatted instruction lines always use spaces. Trailing `//` and `/* ... */` comments are aligned within their group and have at least two preceding spaces. Apple-style symbol relocation modifiers, such as `hwStr@PAGE` and `hwStr@PAGEOFF`, remain part of their operand.

## Requirements

The formatter has no extension dependencies. It runs for documents whose VS Code language ID is `arm64-asm`.

You can use any language extension or file association that supplies that ID. [ARM64 Assembly (GNU AS)](https://marketplace.visualstudio.com/items?itemName=Felipenguim.vscode-arm64-assembly) is one option, but it is not required or installed automatically.

## Use

Choose **Format Document** or **Format Selection** for an `arm64-asm` document. Format-on-save works through VS Code’s normal `editor.formatOnSave` setting. If VS Code asks you to choose a formatter, select **ARM64 Assembly Formatter**.

## Development

```sh
npm install
npm run lint
npm run test:unit
npm test
npm run package
```

Press F5 in VS Code to launch an Extension Development Host using the generated debug configuration.

## License

[MIT](LICENSE)
