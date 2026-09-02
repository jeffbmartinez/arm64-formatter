# ARM64 Assembly Formatter — v1

## Summary

Create a publish-ready TypeScript VS Code extension named `arm64-formatter` (“ARM64 Assembly Formatter”). It will register as the formatter for the `arm64-asm` language mode used by the [ARM64 Assembly (GNU AS) extension](https://marketplace.visualstudio.com/items?itemName=Felipenguim.vscode-arm64-assembly), supporting VS Code’s normal document, selection, keyboard shortcut, and format-on-save mechanisms through the standard formatting-provider API. [VS Code formatting API](https://code.visualstudio.com/api/language-extensions/programmatic-language-features)

## Implementation changes

- Add the normal VS Code extension scaffold: TypeScript source, package manifest, build/test scripts, README, license, and Marketplace-ready metadata for `arm64-formatter`.
- Register whole-document and range-format providers for `arm64-asm`; do not add a command or custom language mode. VS Code determines when formatting runs from the user’s existing editor settings.
- Implement a pure formatter module that:
  - Splits formatting groups only at blank lines. Comment-only, label, and directive lines remain verbatim and do not break a group.
  - Treats any eligible line whose first token neither starts with `.` nor ends with `:` as an instruction or macro call, covering standard mnemonics and calls such as `vparm2` without a mnemonic list.
  - Parses comments before classifying a line. Comment markers inside quoted string or character literals are operand text, not comments.
  - Preserves leading indentation and operand text, while replacing tabs in formatted instruction lines with spaces. The shared operand column is an absolute document column, so preserved indentation participates in alignment.
  - Uses VS Code’s formatting `tabSize` option as the alignment boundary: with a tab size of 2, operands align to even columns; with 4, they align to four-space columns. The operand column is the next configured boundary after the furthest mnemonic end in the group, with at least two spaces after every mnemonic. Labels, directives, and comment-only lines do not contribute to this calculation.
  - Always emits spaces for alignment—even when the user’s editor is configured to insert tabs—matching the v1 preference for tabs-free formatted instruction lines.
  - Recognizes `//` and `/* ... */` comments, including multi-line block comments. Never format text inside comments; keep comment-only lines unchanged; preserve inline comments and align them within their group while keeping at least two spaces after instruction operands. Treat `@` as operand text, preserving relocation modifiers such as `symbol@PAGE` and `symbol@PAGEOFF`.
  - Preserves the document’s existing line-ending style and final-newline presence.
  - Returns one content-only edit for each changed line; unchanged lines and their line endings receive no edit.
- For Format Selection, expand the requested range to every complete nonblank instruction group it intersects—including when the selected line is a label, directive, or comment-only line within that group—while leaving unrelated groups untouched.

## Test plan

- Add the supplied two-group example as a checked-in test fixture and unit-test its exact output under a tab size of 2, including group-specific alignment and inline-comment spacing.
- Repeat alignment tests with a tab size of 4.
- Test the two-space minimum, preserved indentation, tab-to-space conversion, and spaces-only output when `insertSpaces` is false.
- Test group boundaries at blank lines and continuity across comment-only, label, and directive lines.
- Test macro-style calls, directives/labels excluded from rewriting, both AArch64 comment syntaxes, `@PAGE`/`@PAGEOFF` relocation modifiers, and multi-line commented-out code remaining byte-for-byte unchanged.
- Test range formatting expansion from instruction, label/directive, and comment-only lines; no-op output for already formatted documents; per-line minimal edits; and preservation of LF/CRLF and final-newline state.
- Add an extension-host smoke test confirming the formatter registers for `arm64-asm`.

## Assumptions

- V1 exposes no extension-specific formatting settings; it respects only the editor-supplied tab size.
- “Tabs replaced by spaces” means every tab in a formatted instruction line becomes spaces; the user’s tab size controls the alignment boundary, not the emitted character type.
- Inline `/* ... */` comments are handled like other trailing comments; multi-line block-comment content is always preserved exactly.
- Labels and directives are untouched in v1, even when they appear within a nonblank alignment group.
- `@` is not a comment marker in this AArch64 formatter; it remains operand text even when used in Apple-style relocation modifiers.
