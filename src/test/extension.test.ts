import * as assert from 'assert';
import * as vscode from 'vscode';
import { ARM64_ASM_SELECTOR } from '../extension';

suite('ARM64 Assembly Formatter', () => {
	test('activates with an arm64-asm formatter selector', async () => {
		assert.deepStrictEqual(ARM64_ASM_SELECTOR, { language: 'arm64-asm' });
		const extension = vscode.extensions.getExtension('jeffbmartinez.arm64-formatter');
		assert.ok(extension, 'the extension should be available in the test host');
		await extension.activate();
		assert.strictEqual(extension.isActive, true);
	});
});
