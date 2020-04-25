import * as vscode from 'vscode';
import * as child_process from 'child_process';

export const getCurrentFolder = () =>
    vscode.workspace.workspaceFolders && 0 < vscode.workspace.workspaceFolders.length ?
        vscode.workspace.workspaceFolders[0].uri.fsPath:
        ".";
export const activate = (context: vscode.ExtensionContext) =>
{
    console.log('Congratulations, your extension "windows-terminal" is now active!');

    context.subscriptions.push
    (
        vscode.commands.registerCommand
        (
            'windowsTerminal.showStore',
            async () => await vscode.env.openExternal(vscode.Uri.parse("https://www.microsoft.com/ja-jp/p/windows-terminal-preview/9n0dx20hk701"))
        ),
        vscode.commands.registerCommand
        (
            'windowsTerminal.open',
            () => child_process.exec(`wt -d ${getCurrentFolder()}`),
        )
    );
};

export const deactivate = ( ) => { };
