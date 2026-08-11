export interface FormatterOptions {
  tabSize: number;
}

export interface LineEdit {
  line: number;
  text: string;
}

interface InstructionLine {
  kind: "instruction";
  line: number;
  indent: string;
  mnemonic: string;
  operands: string;
  comment: string;
  mnemonicEnd: number;
}

interface OtherLine {
  kind: "other";
  line: number;
}

type ParsedLine = InstructionLine | OtherLine;

interface Group {
  start: number;
  end: number;
  instructions: InstructionLine[];
}

const lineCommentMarkers = ["//", "@"];

/** Formats all instruction groups, returning content-only edits for changed lines. */
export function formatDocument(text: string, options: FormatterOptions): LineEdit[] {
  return formatGroups(text, options, () => true);
}

/** Formats each nonblank group that intersects the supplied inclusive line range. */
export function formatRange(
  text: string,
  options: FormatterOptions,
  startLine: number,
  endLine: number,
): LineEdit[] {
  return formatGroups(text, options, (group) => group.start <= endLine && group.end >= startLine);
}

function formatGroups(
  text: string,
  options: FormatterOptions,
  shouldFormat: (group: Group) => boolean,
): LineEdit[] {
  const lines = splitLines(text);
  const tabSize = Math.max(1, options.tabSize);
  const groups = parseGroups(lines, tabSize);
  const edits: LineEdit[] = [];

  for (const group of groups) {
    if (!shouldFormat(group) || group.instructions.length === 0) {
      continue;
    }

    const operandColumn = group.instructions
      .filter((instruction) => instruction.operands.length > 0)
      .reduce((column, instruction) => Math.max(column, instruction.mnemonicEnd + 2), 0);
    const alignedOperandColumn = operandColumn === 0
      ? 0
      : roundUpToBoundary(operandColumn, tabSize);
    const commentColumn = group.instructions
      .filter((instruction) => instruction.operands.length > 0 && instruction.comment.length > 0)
      .reduce(
        (column, instruction) => Math.max(column, alignedOperandColumn + instruction.operands.length + 2),
        0,
      );

    for (const instruction of group.instructions) {
      const formatted = formatInstruction(instruction, alignedOperandColumn, commentColumn);
      if (formatted !== lines[instruction.line]) {
        edits.push({ line: instruction.line, text: formatted });
      }
    }
  }

  return edits;
}

function splitLines(text: string): string[] {
  return text.split(/\r\n|\n|\r/);
}

function parseGroups(lines: string[], tabSize: number): Group[] {
  const groups: Group[] = [];
  let groupStart: number | undefined;
  let parsed: ParsedLine[] = [];
  let inBlockComment = false;

  const finishGroup = (end: number) => {
    if (groupStart === undefined) return;
    groups.push({
      start: groupStart,
      end,
      instructions: parsed.filter((line): line is InstructionLine => line.kind === "instruction"),
    });
    groupStart = undefined;
    parsed = [];
  };

  for (let line = 0; line < lines.length; line += 1) {
    if (lines[line].trim().length === 0) {
      finishGroup(line - 1);
      continue;
    }

    if (groupStart === undefined) groupStart = line;
    const result = parseLine(lines[line], line, tabSize, inBlockComment);
    inBlockComment = result.inBlockComment;
    parsed.push(result.line);
  }
  finishGroup(lines.length - 1);
  return groups;
}

function parseLine(
  original: string,
  line: number,
  tabSize: number,
  initiallyInBlockComment: boolean,
): { line: ParsedLine; inBlockComment: boolean } {
  // A line containing block-comment content is preserved exactly. This also avoids
  // treating comment markers within the block as source syntax.
  if (initiallyInBlockComment) {
    return { line: { kind: "other", line }, inBlockComment: !original.includes("*/") };
  }

  const source = original.replace(/\t/g, " ".repeat(tabSize));
  const comment = findComment(source);
  const code = comment === undefined ? source : source.slice(0, comment.index);
  const trailingComment = comment === undefined ? "" : source.slice(comment.index).trimStart();
  const trimmed = code.trim();
  const inBlockComment = comment?.marker === "/*" && !trailingComment.includes("*/");

  if (trimmed.length === 0) {
    return { line: { kind: "other", line }, inBlockComment };
  }

  const indent = code.match(/^\s*/)?.[0] ?? "";
  const body = code.slice(indent.length).trimEnd();
  const tokenMatch = /^(\S+)(?:\s+([\s\S]*?))?$/.exec(body);
  if (!tokenMatch) return { line: { kind: "other", line }, inBlockComment };

  const mnemonic = tokenMatch[1];
  if (mnemonic.startsWith(".") || mnemonic.endsWith(":")) {
    return { line: { kind: "other", line }, inBlockComment };
  }

  return {
    line: {
      kind: "instruction",
      line,
      indent,
      mnemonic,
      operands: tokenMatch[2]?.trim() ?? "",
      comment: trailingComment,
      mnemonicEnd: indent.length + mnemonic.length,
    },
    inBlockComment,
  };
}

function findComment(source: string): { index: number; marker: string } | undefined {
  let quote: "'" | '"' | undefined;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = undefined;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (source.startsWith("/*", index)) return { index, marker: "/*" };
    if (lineCommentMarkers.some((marker) => source.startsWith(marker, index))) {
      return { index, marker: source.startsWith("//", index) ? "//" : "@" };
    }
  }
  return undefined;
}

function formatInstruction(instruction: InstructionLine, operandColumn: number, commentColumn: number): string {
  const prefix = `${instruction.indent}${instruction.mnemonic}`;
  if (instruction.operands.length === 0) {
    return instruction.comment.length === 0 ? prefix : `${prefix}  ${instruction.comment}`;
  }
  const beforeOperands = " ".repeat(Math.max(2, operandColumn - prefix.length));
  const operandEnd = prefix.length + beforeOperands.length + instruction.operands.length;
  const beforeComment = instruction.comment.length === 0
    ? ""
    : `${" ".repeat(Math.max(2, commentColumn - operandEnd))}${instruction.comment}`;
  return `${prefix}${beforeOperands}${instruction.operands}${beforeComment}`;
}

function roundUpToBoundary(column: number, tabSize: number): number {
  return Math.ceil(column / tabSize) * tabSize;
}
