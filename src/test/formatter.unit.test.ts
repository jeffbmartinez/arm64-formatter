import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDocument, formatRange, type LineEdit } from '../formatter';

function applyEdits(source: string, edits: readonly LineEdit[]): string {
	const lines = source.split(/\r\n|\n|\r/);
	for (const edit of edits) {
		lines[edit.line] = edit.text;
	}
	return lines.join(source.includes('\r\n') ? '\r\n' : '\n');
}

test('formats the supplied two-group example at a tab size of 2', () => {
	const source = [
		'// Demonstrate the not instruction',
		'lea x0, leftOp',
		'ldr x1, [x0]',
		'mvn w1, w1 // Use 32-bit register',
		'lea x0, result',
		'str w1, [x0]',
		'',
		'// Print the result',
		'lea x0, fmtStr4',
		'vparm2 leftOp',
		'vparm3 result',
		'bl printf',
		'',
	].join('\n');
	const expected = [
		'// Demonstrate the not instruction',
		'lea   x0, leftOp',
		'ldr   x1, [x0]',
		'mvn   w1, w1    // Use 32-bit register',
		'lea   x0, result',
		'str   w1, [x0]',
		'',
		'// Print the result',
		'lea     x0, fmtStr4',
		'vparm2  leftOp',
		'vparm3  result',
		'bl      printf',
		'',
	].join('\n');
	assert.equal(applyEdits(source, formatDocument(source, 2)), expected);
});

test('uses absolute columns and the configured tab boundary', () => {
	const source = '  add x0, x1\n  longest x0, x1\n';
	assert.equal(
		applyEdits(source, formatDocument(source, 4)),
		'  add       x0, x1\n  longest   x0, x1\n',
	);
});

test('formats macro calls, replaces tabs, and leaves labels and directives unchanged', () => {
	const source = '.text\nstart:\n\tvparm2\tleftOp\n// note\n\tadd\tx0, x1\n';
	const output = applyEdits(source, formatDocument(source, 2));
	assert.equal(output, '.text\nstart:\n  vparm2  leftOp\n// note\n  add     x0, x1\n');
	assert.equal(output.includes('\t'), false);
});

test('preserves @ relocation modifiers and recognizes only AArch64 comment syntax', () => {
	const source = '  .ascii "@ // /*"\n  adrp x0, hwStr@PAGE\n  add x0, x0, hwStr@PAGEOFF\n  ldr x1, ="//" // line\n/*\n  add x0, x1\n*/\n  add x0, x1\n  long x0, x1\n';
	assert.equal(
		applyEdits(source, formatDocument(source, 2)),
		'  .ascii "@ // /*"\n  adrp  x0, hwStr@PAGE\n  add   x0, x0, hwStr@PAGEOFF\n  ldr   x1, ="//"            // line\n/*\n  add x0, x1\n*/\n  add   x0, x1\n  long  x0, x1\n',
	);
});

test('preserves CRLF/final-newline state and returns only changed lines', () => {
	const source = 'add x0, x1\r\nlong  x0, x1';
	const edits = formatDocument(source, 2);
	assert.deepEqual(edits, [{ line: 0, text: 'add   x0, x1' }]);
	assert.equal(applyEdits(source, edits), 'add   x0, x1\r\nlong  x0, x1');
});

test('expands a selected comment-only line to its complete instruction group', () => {
	const source = 'add x0, x1\n// note\nlong x0, x1\n\nsub x0, x1\nlong x0, x1\n';
	assert.deepEqual(formatRange(source, 2, 1, 1), [
		{ line: 0, text: 'add   x0, x1' },
		{ line: 2, text: 'long  x0, x1' },
	]);
});
