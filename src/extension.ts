import * as vscode from 'vscode';
import { formatDocument, formatRange } from './formatter';

export const ARM64_ASM_SELECTOR: vscode.DocumentSelector = { language: 'arm64-asm' };

export function activate(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		vscode.languages.registerDocumentFormattingEditProvider(ARM64_ASM_SELECTOR, {
			provideDocumentFormattingEdits(document, options) {
				return toTextEdits(document, formatDocument(document.getText(), options.tabSize));
			},
		}),
		vscode.languages.registerDocumentRangeFormattingEditProvider(ARM64_ASM_SELECTOR, {
			provideDocumentRangeFormattingEdits(document, range, options) {
				const endLine = range.end.character === 0 && range.end.line > range.start.line
					? range.end.line - 1
					: range.end.line;
				return toTextEdits(document, formatRange(document.getText(), options.tabSize, range.start.line, endLine));
			},
		}),
	);
}

function toTextEdits(document: vscode.TextDocument, edits: ReadonlyArray<{ line: number; text: string }>): vscode.TextEdit[] {
	return edits.map(({ line, text }) => vscode.TextEdit.replace(document.lineAt(line).range, text));
}
