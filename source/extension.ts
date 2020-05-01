import * as vscode from 'vscode' ;
import * as process from 'process' ;
import * as child_process from 'child_process' ;
import * as Config from "./library/config" ;
export const settingsJsonPath = new Config . Entry < string > ( "windowsTerminal.settingsJsonPath" ) ;
export const defaultProfile = new Config . Entry < string > ( "windowsTerminal.defaultProfile" ) ;
export const defaultDirectory = new Config . Entry < string > ( "windowsTerminal.defaultDirectory" ) ;
interface SettingsJson
{
    "$schema" : string ;
    defaultProfile : string ;
    copyOnSelect : boolean ;
    copyFormatting : boolean ;
    profiles : SettingsJsonProfiles ;
    schemes : unknown [ ] ;
    keybinding : SettingsJsonKeybinding;
}
interface SettingsJsonProfiles
{
    defaults : unknown [ ] ;
    list : SettingsJsonProfileEntry [ ] ;
}
interface SettingsJsonProfileEntry
{
    guid : string ;
    name : string ;
    commandline : string ;
    hidden: boolean ;
}
interface SettingsJsonKeybinding
{
    command : string | SettingsJsonKeybindingCommand ;
    keys : string ;
}
interface SettingsJsonKeybindingCommand
{
    action : string ;
    singleLine : boolean ;
    split : string ;
    splitMode : string ;
}
export const getStoreUri = ( ) => vscode.Uri.parse ( "https://www.microsoft.com/ja-jp/p/windows-terminal-preview/9n0dx20hk701" ) ;
export const getSettingJsonPath = async ( ) =>
{
    const config = settingsJsonPath . get ( "" ) ;
    if ( null !== config && "" !== config )
    {
        return config;
    }
    return `${ process . env [ "USERPROFILE" ] }\\AppData\\Local\\Packages\\Microsoft.WindowsTerminal_8wekyb3d8bbwe\\LocalState\\settings.json` ;
} ;
export const getCurrentFolder = ( ) : string =>
    vscode . workspace . workspaceFolders &&
    0 < vscode . workspace . workspaceFolders . length ?
        vscode . workspace . workspaceFolders [ 0 ] . uri . fsPath :
        "." ;
export const getSettingJsonDocument = async ( ) => await vscode . workspace . openTextDocument
(
    await getSettingJsonPath ( )
) ;
export const makeDirectoryParam = (directory : string | null) => directory ? ` -d ${ directory }` : "";
export const makeProfileParam = (profile : string | null) => profile ? ` -p ${ profile }` : "";
export const executeWindowsTerminal =
(
    data :
    {
        directory ? : string ,
        profile ? : string ,
    }
    = { }
) => child_process . exec
(
    [
        "wt" ,
        makeDirectoryParam ( data . directory ?? defaultDirectory.get("") ?? getCurrentFolder ( ) ) ,
        makeProfileParam ( data . profile ?? defaultDirectory.get("") ) ,
    ]
    .join("")
);
export const activate = ( context : vscode . ExtensionContext ) => context . subscriptions . push
(
    vscode . commands . registerCommand
    (
        'windowsTerminal.showStore' ,
        async ( ) => await vscode . env . openExternal ( getStoreUri ( ) )
    ) ,
    vscode . commands . registerCommand
    (
        'windowsTerminal.open',
        ( ) => executeWindowsTerminal ( )
    ) ,
    vscode . commands . registerCommand
    (
        'windowsTerminal.openProfile' ,
        async ( ) =>
        (
            await vscode . window . showQuickPick
            (
                (
                    < SettingsJson > JSON . parse
                    (
                        (
                            await getSettingJsonDocument ( )
                        )
                        . getText ( )
                        . replace ( /^\s*(\/\/.*)$/gm , "" )
                    )
                )
                . profiles . list . map
                (
                    p =>
                    ({
                        label : p . name ,
                        command : ( ) => executeWindowsTerminal ({ profile : p . guid }) ,
                    })
                )
            )
        ) ?. command ( )
    ) ,
    vscode . commands . registerCommand
    (
        'windowsTerminal.openSettings' ,
        async ( ) => await vscode . window . showTextDocument ( await getSettingJsonDocument ( ) )
    )
) ;
export const deactivate = ( ) => { } ;
