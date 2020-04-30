import * as vscode from 'vscode';
import * as process from 'process';
import * as child_process from 'child_process';

interface SettingsJson
{
    "$schema": string;
    defaultProfile: string;
    copyOnSelect: boolean;
    copyFormatting: boolean;
    profiles: SettingsJsonProfiles;
    schemes: unknown[];
    keybinding: SettingsJsonKeybinding
}
interface SettingsJsonProfiles
{
    defaults: unknown[];
    list: SettingsJsonProfileEntry[];
}
interface SettingsJsonProfileEntry
{
    guid: string;
    name: string;
    commandline: string;
    hidden: boolean;
}
interface SettingsJsonKeybinding
{
    command: string | SettingsJsonKeybindingCommand;
    keys: string;
}
interface SettingsJsonKeybindingCommand
{
    action: string;
    singleLine: boolean;
    split: string;
    splitMode: string;
}

export const getStoreUri = () => vscode.Uri.parse("https://www.microsoft.com/ja-jp/p/windows-terminal-preview/9n0dx20hk701");
export const getSettingJsonPath = () => `${process.env["USERPROFILE"]}\\AppData\\Local\\Packages\\Microsoft.WindowsTerminal_8wekyb3d8bbwe\\LocalState\\settings.json`;
export const getCurrentFolder = () =>
    vscode.workspace.workspaceFolders && 0 < vscode.workspace.workspaceFolders.length ?
        vscode.workspace.workspaceFolders[0].uri.fsPath:
        ".";
export const getSettingJsonDocument = async () => await vscode.workspace.openTextDocument
(
    getSettingJsonPath()
);
export const activate = (context: vscode.ExtensionContext) => context.subscriptions.push
(
    vscode.commands.registerCommand
    (
        'windowsTerminal.showStore',
        async () => await vscode.env.openExternal(getStoreUri())
    ),
    vscode.commands.registerCommand
    (
        'windowsTerminal.open',
        () => child_process.exec(`wt -d ${getCurrentFolder()}`)
    ),
    vscode.commands.registerCommand
    (
        'windowsTerminal.openProfile',
        async () =>
        (
            await vscode.window.showQuickPick
            (
                (
                    <SettingsJson>JSON.parse
                    (
                        (
                            await getSettingJsonDocument()
                        )
                        .getText()
                        .replace(/^\s*(\/\/.*)$/gm, "")
                    )
                )
                .profiles.list.map
                (
                    p =>
                    ({
                        label: p.name,
                        command: () => child_process.exec(`wt -d ${getCurrentFolder()} -p ${p.guid}`)
                    })
                )
            )
        )?.command()
    ),
    vscode.commands.registerCommand
    (
        'windowsTerminal.openSettings',
        async () => await vscode.window.showTextDocument(await getSettingJsonDocument())
    )
);

export const deactivate = ( ) => { };
