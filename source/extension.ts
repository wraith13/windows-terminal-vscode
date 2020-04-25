import * as vscode from 'vscode';

export const activate = (context: vscode.ExtensionContext) =>
{
    console.log('Congratulations, your extension "windows-terminal" is now active!');

    context.subscriptions.push
    (
        vscode.commands.registerCommand
        (
            'extension.helloWorld',
            async () =>
            {
                vscode.window.showInformationMessage('Hello World!');
                await vscode.env.openExternal(vscode.Uri.parse("https://www.microsoft.com/ja-jp/p/windows-terminal-preview/9n0dx20hk701"));
            }
        )
    );
};

export const deactivate = ( ) => { };
