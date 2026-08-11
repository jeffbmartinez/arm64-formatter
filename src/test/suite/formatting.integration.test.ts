import * as assert from "node:assert";
import * as vscode from "vscode";

suite("ARM64 formatter", () => {
  test("registers a document formatter for arm64-asm", async () => {
    const extension = vscode.extensions.getExtension("jeffbmartinez.arm64-formatter");
    assert.ok(extension, "extension should be available in the test host");
    await extension.activate();

    const document = await vscode.workspace.openTextDocument({
      language: "arm64-asm",
      content: "add x0, x1\nlong x0, x1\n",
    });
    const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
      "vscode.executeFormatDocumentProvider",
      document.uri,
      { tabSize: 2, insertSpaces: true },
    );
    assert.ok(edits?.some((edit) => edit.newText === "add   x0, x1"));
  });
});
