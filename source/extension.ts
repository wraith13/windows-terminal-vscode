import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext)
{

    console.log('Congratulations, your extension "windows-terminal" is now active!');

    let disposable = vscode.commands.registerCommand('extension.helloWorld', async () => {
        vscode.window.showInformationMessage('Hello World!');
        await vscode.env.openExternal(vscode.Uri.parse("https://www.microsoft.com/ja-jp/p/windows-terminal-preview/9n0dx20hk701"));
    });
    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
