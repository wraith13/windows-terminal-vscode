import * as vscode from 'vscode';
import * as process from 'process';
import * as child_process from 'child_process';
import * as vscel from '@wraith13/vscel';
import packageJson from "../package.json";
import localeEn from "../package.nls.json";
import localeJa from "../package.nls.ja.json";
const locale = vscel.locale.make(localeEn, { "ja": localeJa });
const statusBarAlignmentObject = Object.freeze
({
    "none": undefined,
    "left": vscode.StatusBarAlignment.Left,
    "right": vscode.StatusBarAlignment.Right,
});
const statusBarCommandObject = Object.freeze
({
    "windowsTerminal.open": "Open Windows Terminal",
    "windowsTerminal.openProfile": "Open Windows Terminal with Profile",
    "windowsTerminal.openSettings": "Open Windows Terminal's settings.json"
});
const directoryOptionPriorityObject = Object.freeze
({
    "No specified":
    async (
        _getVscodeSettingValue: () => Promise<string | null>,
        _getWindowsTerminalSettingValue: () => Promise<string | null>
    ) => null,
    "Prioritize Windows Terminal's settings":
    async (
        getVscodeSettingValue: () => Promise<string | null>,
        getWindowsTerminalSettingValue: () => Promise<string | null>
    ) => await getWindowsTerminalSettingValue () ?? await getVscodeSettingValue(),
    "Prioritize VS Code's settings":
    async (
        getVscodeSettingValue: () => Promise<string | null>,
        getWindowsTerminalSettingValue: () => Promise<string | null>
    ) => await getVscodeSettingValue () ?? await getWindowsTerminalSettingValue(),
});
module Config
{
    export const root = vscel.config.makeRoot(packageJson);
    export const debug = root.makeEntry<boolean>("windowsTerminal.debug", "active-workspace");
    export const statusBarText = root.makeEntry<string>("windowsTerminal.statusBarText", "root-workspace");
    export const statusBarAlignment = root.makeMapEntry("windowsTerminal.statusBarAlignment", "root-workspace", statusBarAlignmentObject);
    export const statusBarCommand = root.makeMapEntry("windowsTerminal.statusBarCommand", "root-workspace", statusBarCommandObject);
    export const settingsJsonPath = root.makeEntry<string>("windowsTerminal.settingsJsonPath", "active-workspace");
    export const defaultProfile = root.makeEntry<string>("windowsTerminal.defaultProfile", "active-workspace");
    export const directoryOptionPriority = root.makeMapEntry("windowsTerminal.directoryOptionPriority", "active-workspace", directoryOptionPriorityObject);
    export const defaultDirectory = root.makeEntry<string>("windowsTerminal.defaultDirectory", "active-workspace");
    export const defaultOptions = root.makeEntry<string>("windowsTerminal.defaultOptions", "active-workspace");
}
const debug = <T>(output: T): T =>
{
    if (Config.debug.get("default-scope"))
    {
        console.debug(output);
    }
    return output;
};
interface SettingsJson
{
    "$schema": string;
    defaultProfile: string;
    copyOnSelect: boolean;
    copyFormatting: boolean;
    profiles: SettingsJsonProfiles;
    schemes: unknown[];
    keybinding: SettingsJsonKeybinding;
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
    startingDirectory?: string;
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
module StatusBarItem
{
    let statusBarItem: vscode.StatusBarItem;
    export const make = () => statusBarItem = vscel.statusbar.createItem
    ({
        alignment: Config.statusBarAlignment.get("default-scope"),
        text: Config.statusBarText.get("default-scope"),
        command: Config.statusBarCommand.getKey("default-scope"),
        tooltip: Config.statusBarCommand.get("default-scope"),
        withShow: null !== Config.statusBarAlignment.get("default-scope"),
    });
    export const update = (): void =>
    {
        statusBarItem.text = Config.statusBarText.get("default-scope");
        statusBarItem.command = Config.statusBarCommand.getKey("default-scope");
        statusBarItem.tooltip = Config.statusBarCommand.get("default-scope");
        statusBarItem.show();
    };
}
export const getStoreUri = () => vscode.Uri.parse("https://www.microsoft.com/p/windows-terminal/9n0dx20hk701");
export const getDocumentUri = () => vscode.Uri.parse("https://github.com/microsoft/terminal/tree/master/doc/user-docs");
export const getSettingsJsonPath = async () =>
{
    const config = Config.settingsJsonPath.get("default-scope");
    if (null !== config && "" !== config)
    {
        return config;
    }
    // settings.json のパスは決め打ちで良いっぽい。 https://github.com/microsoft/terminal/blob/master/doc/user-docs/UsingJsonSettings.md
    return `${ process.env [ "LOCALAPPDATA" ] }\\Packages\\Microsoft.WindowsTerminal_8wekyb3d8bbwe\\LocalState\\settings.json`;
};
export const getCurrentFolder = () =>
    vscode.workspace.workspaceFolders &&
    0 < vscode.workspace.workspaceFolders.length ?
        vscode.workspace.workspaceFolders[0].uri.fsPath:
        null;
export const parseJsonWithComment = (json: string) => JSON.parse
(
    json.replace (/^\s*(\/\/.*)$/gm, "")
);
export const getSettingsJsonDocument = async () => await vscode.workspace.openTextDocument
(
    await getSettingsJsonPath()
);
export const getSettings = async () => < SettingsJson > parseJsonWithComment
(
    (
        await getSettingsJsonDocument()
    )
    .getText()
);
export const getProfileStartingDirectory = async (profile: string | null) =>
{
    const settings = await getSettings();
    profile = profile ?? settings.defaultProfile;
    return settings.profiles.list
        .filter (i => i.guid === profile) [ 0 ] ?. startingDirectory ?? null;
};
export const makeProfileParam = (profile: string | null) => profile ? ` -p ${ profile }`: "";
export const makeDirectoryParam = (directory: string | null) => directory ? ` -d \"${ directory }\"`: "";
export const executeWindowsTerminal =
async (
    data:
    {
        directory?: string,
        profile?: string,
    }
    = { }
) => child_process.exec
(
    debug
    (
        [
            "wt",
            Config.defaultOptions.get("default-scope") ?? "",
            makeProfileParam(data.profile ?? Config.defaultProfile.get("default-scope")),
            makeDirectoryParam
            (
                data.directory ??
                await Config.directoryOptionPriority.get("default-scope")
                (
                    async () =>(Config.defaultDirectory.get("default-scope") ?? getCurrentFolder()),
                    async () => await getProfileStartingDirectory(data.profile ?? Config.defaultProfile.get("default-scope"))
                )
            ),
        ]
        .join("")
    )
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
        'windowsTerminal.showDocument',
        async () => await vscode.env.openExternal(getDocumentUri())
    ),
    vscode.commands.registerCommand
    (
        'windowsTerminal.open',
        async () => await executeWindowsTerminal()
    ),
    vscode.commands.registerCommand
    (
        'windowsTerminal.openProfile',
        async () =>
        {
            const settings = await getSettings();
            (
                await vscode.window.showQuickPick
                (
                    settings.profiles.list
                    .filter(p => ! p.hidden)
                    .map
                    (
                        p =>
                        ({
                            label: p.name,
                            description: settings.defaultProfile === p.guid ? "default": undefined,
                            detail: p.guid,
                            command: async () => await executeWindowsTerminal({ profile: p.guid }),
                        })
                    ),
                    {
                        placeHolder: locale.map("selectProfile"),
                        matchOnDescription: true,
                        matchOnDetail: true,
                    }
                )
            )?.command();
        }
    ),
    vscode.commands.registerCommand
    (
        'windowsTerminal.openSettings',
        async () => await vscode.window.showTextDocument(await getSettingsJsonDocument())
    ),
    vscode.workspace.onDidChangeConfiguration
    (
        async (event) =>
        {
            if
            (
                event.affectsConfiguration("windowsTerminal")
            )
            {
                // Config.root.entries.forEach(i => i.clear());
                StatusBarItem.update();
            }
        }
    ),
    StatusBarItem.make()
);
export const deactivate = () => { };
