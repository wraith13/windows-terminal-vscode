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
export const getCurrentFolder = ( ) : string =>
    vscode . workspace . workspaceFolders &&
    0 < vscode . workspace . workspaceFolders . length ?
        vscode . workspace . workspaceFolders [ 0 ] . uri . fsPath :
        "." ;
export const parseJsonWithComment = ( json : string ) => JSON . parse
(
    json . replace ( /^\s*(\/\/.*)$/gm , "" )
);
export const isCandidateSettingJson = async ( document : vscode . TextDocument ) =>
{
    if ( "json" === document . languageId )
    {
        try
        {
            const settings = < SettingsJson > parseJsonWithComment ( document . getText ( ) );
            if ( "https://aka.ms/terminal-profiles-schema" === settings.$schema )
            {
                return true;
            }
        }
        catch ( error )
        {
            console.log ( error ) ;
        }
    }
    return false;
};
export const getSettingJsonDocument = async ( ) => await vscode . workspace . openTextDocument
(
    settingsJsonPath . get ( "" )
) ;
export const makeDirectoryParam = ( directory : string | null ) => directory ? ` -d ${ directory }` : "" ;
export const makeProfileParam = ( profile : string | null ) => profile ? ` -p ${ profile }` : "" ;
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
        makeDirectoryParam ( data . directory ?? defaultDirectory . get ( "" ) ?? getCurrentFolder ( ) ) ,
        makeProfileParam ( data . profile ?? defaultDirectory . get ( "" ) ) ,
    ]
    .join("")
);
export const registerSettingsJsonUri = async ( uri : vscode . Uri ) => await settingsJsonPath . set ( uri . fsPath ) ;
export const activate = ( context : vscode . ExtensionContext ) => context . subscriptions . push
(
    vscode . commands . registerCommand
    (
        'windowsTerminal.showStore' ,
        async ( ) => await vscode . env . openExternal ( getStoreUri ( ) )
    ) ,
    vscode . commands . registerCommand
    (
        'windowsTerminal.open' ,
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
                    < SettingsJson > parseJsonWithComment
                    (
                        (
                            await getSettingJsonDocument ( )
                        )
                        . getText ( )
                    )
                )
                . profiles . list
                . filter ( p => ! p . hidden )
                . map
                (
                    p =>
                    ({
                        label : p . name ,
                        detail: p . guid ,
                        command : ( ) => executeWindowsTerminal ({ profile : p . guid }) ,
                    })
                ),
                {
                    matchOnDetail : true
                }
            )
        ) ?. command ( )
    ) ,
    vscode . commands . registerCommand
    (
        'windowsTerminal.openSettings' ,
        async ( ) => await vscode . window . showTextDocument ( await getSettingJsonDocument ( ) )
    ),
    vscode . commands . registerCommand
    (
        'windowsTerminal.registerSettings' ,
        async ( ) =>
        {
            const document = vscode . window . activeTextEditor ?. document;
            if ( document )
            {
                registerSettingsJsonUri ( document . uri ) ;
            }
        }
    ),
    vscode . workspace . onDidChangeConfiguration
    (
        event =>
        {
            settingsJsonPath . onDidChangeConfiguration ( event . affectsConfiguration ) ;
            defaultProfile . onDidChangeConfiguration ( event . affectsConfiguration ) ;
            defaultDirectory . onDidChangeConfiguration ( event . affectsConfiguration ) ;
        }
    ),
    vscode . workspace . onDidOpenTextDocument
    (
        async ( document ) =>
        {
            if ( settingsJsonPath . get ( "" ) && isCandidateSettingJson ( document ) )
            {
                if
                (
                    "Yes" === await vscode . window . showInformationMessage
                    (
                        "Do you register this document as Windows Terminal's settings.json ?",
                        "Yes",
                        "No"
                    )
                )
                {
                    registerSettingsJsonUri ( document . uri ) ;
                }
            }
        }
    )
) ;
export const deactivate = ( ) => { } ;
