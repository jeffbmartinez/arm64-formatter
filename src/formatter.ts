export interface LineEdit {
	line: number;
	text: string;
}

interface InstructionLine {
	line: number;
	indent: string;
	mnemonic: string;
	operands: string;
	comment: string;
	mnemonicEnd: number;
}

interface Group {
	start: number;
	end: number;
	instructions: InstructionLine[];
}

/** Formats every nonblank instruction group and returns content-only line edits. */
export function formatDocument(text: string, tabSize: number): LineEdit[] {
	return formatGroups(text, tabSize, () => true);
}

/** Formats each complete nonblank group intersecting the inclusive line range. */
export function formatRange(text: string, tabSize: number, startLine: number, endLine: number): LineEdit[] {
	return formatGroups(text, tabSize, (group) => group.start <= endLine && group.end >= startLine);
}

function formatGroups(text: string, requestedTabSize: number, shouldFormat: (group: Group) => boolean): LineEdit[] {
	const lines = text.split(/\r\n|\n|\r/);
	const tabSize = Math.max(1, requestedTabSize);
	const edits: LineEdit[] = [];

	for (const group of parseGroups(lines, tabSize)) {
		if (!shouldFormat(group) || group.instructions.length === 0) {
			continue;
		}

		const operandColumn = group.instructions
			.filter((instruction) => instruction.operands.length > 0)
			.reduce((furthest, instruction) => Math.max(furthest, instruction.mnemonicEnd + 2), 0);
		const alignedOperandColumn = operandColumn === 0 ? 0 : roundUp(operandColumn, tabSize);
		const commentColumn = group.instructions.some((instruction) => instruction.comment.length > 0)
			? group.instructions
				.filter((instruction) => instruction.operands.length > 0)
				.reduce((furthest, instruction) => Math.max(furthest, alignedOperandColumn + instruction.operands.length), 0)
			: 0;

		for (const instruction of group.instructions) {
			const formatted = formatInstruction(instruction, alignedOperandColumn, commentColumn);
			if (formatted !== lines[instruction.line]) {
				edits.push({ line: instruction.line, text: formatted });
			}
		}
	}

	return edits;
}

function parseGroups(lines: readonly string[], tabSize: number): Group[] {
	const groups: Group[] = [];
	let start: number | undefined;
	let instructions: InstructionLine[] = [];
	let inBlockComment = false;

	const finish = (end: number) => {
		if (start !== undefined) {
			groups.push({ start, end, instructions });
			start = undefined;
			instructions = [];
		}
	};

	for (let line = 0; line < lines.length; line += 1) {
		if (lines[line].trim().length === 0) {
			finish(line - 1);
			continue;
		}
		start ??= line;
		const parsed = parseInstruction(lines[line], line, tabSize, inBlockComment);
		inBlockComment = parsed.inBlockComment;
		if (parsed.instruction) {
			instructions.push(parsed.instruction);
		}
	}
	finish(lines.length - 1);
	return groups;
}

function parseInstruction(original: string, line: number, tabSize: number, initiallyInBlockComment: boolean): {
	instruction?: InstructionLine;
	inBlockComment: boolean;
} {
	if (initiallyInBlockComment) {
		return { inBlockComment: !original.includes('*/') };
	}

	const source = original.replace(/\t/g, ' '.repeat(tabSize));
	const comment = findComment(source);
	const code = comment ? source.slice(0, comment.index) : source;
	const trailingComment = comment ? source.slice(comment.index).trimStart() : '';
	const inBlockComment = comment?.marker === '/*' && !trailingComment.includes('*/');
	if (code.trim().length === 0) {
		return { inBlockComment };
	}

	const indent = code.match(/^\s*/)?.[0] ?? '';
	const body = code.slice(indent.length).trimEnd();
	const match = /^(\S+)(?:\s+([\s\S]*?))?$/.exec(body);
	if (!match || match[1].startsWith('.') || match[1].endsWith(':')) {
		return { inBlockComment };
	}

	const mnemonic = match[1];
	return {
		instruction: {
			line,
			indent,
			mnemonic,
			operands: match[2]?.trim() ?? '',
			comment: trailingComment,
			mnemonicEnd: indent.length + mnemonic.length,
		},
		inBlockComment,
	};
}

function findComment(source: string): { index: number; marker: string } | undefined {
	let quote: '"' | "'" | undefined;
	let escaped = false;
	for (let index = 0; index < source.length; index += 1) {
		const character = source[index];
		if (quote) {
			if (escaped) {
				escaped = false;
			} else if (character === '\\') {
				escaped = true;
			} else if (character === quote) {
				quote = undefined;
			}
			continue;
		}
		if (character === '"' || character === "'") {
			quote = character;
			continue;
		}
		if (source.startsWith('/*', index)) {
			return { index, marker: '/*' };
		}
		if (source.startsWith('//', index)) {
			return { index, marker: '//' };
		}
	}
	return undefined;
}

function formatInstruction(instruction: InstructionLine, operandColumn: number, commentColumn: number): string {
	const prefix = `${instruction.indent}${instruction.mnemonic}`;
	if (instruction.operands.length === 0) {
		return instruction.comment.length === 0 ? prefix : `${prefix}  ${instruction.comment}`;
	}
	const beforeOperands = ' '.repeat(Math.max(2, operandColumn - prefix.length));
	const operandEnd = prefix.length + beforeOperands.length + instruction.operands.length;
	const beforeComment = instruction.comment.length === 0
		? ''
		: `${' '.repeat(Math.max(2, commentColumn - operandEnd))}${instruction.comment}`;
	return `${prefix}${beforeOperands}${instruction.operands}${beforeComment}`;
}

function roundUp(column: number, tabSize: number): number {
	return Math.ceil(column / tabSize) * tabSize;
}
