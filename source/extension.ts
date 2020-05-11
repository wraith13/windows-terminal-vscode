import * as vscode from 'vscode' ;
import * as process from 'process' ;
import * as child_process from 'child_process' ;
import * as Config from "./library/config" ;
const statusBarAlignmentObject = Object . freeze
({
    "none" : undefined ,
    "left" : vscode . StatusBarAlignment . Left ,
    "right" : vscode . StatusBarAlignment . Right ,
}) ;
export const statusBarText = new Config . Entry < string > ( "windowsTerminal.statusBarText" ) ;
export const statusBarAlignment = new Config.MapEntry ( "windowsTerminal.statusBarAlignment" , statusBarAlignmentObject );
const statusBarCommandObject = Object . freeze
({
    "windowsTerminal.open" : "Open Windows Terminal",
    "windowsTerminal.openProfile" : "Open Windows Terminal with Profile",
    "windowsTerminal.openSettings" : "Open Windows Terminal's settings.json"
}) ;
export const statusBarCommand = new Config.MapEntry ( "windowsTerminal.statusBarCommand" , statusBarCommandObject );
export const settingsJsonPath = new Config . Entry < string > ( "windowsTerminal.settingsJsonPath" ) ;
export const defaultProfile = new Config . Entry < string > ( "windowsTerminal.defaultProfile" ) ;
export const enabledDirectoryOption = new Config . Entry < boolean > ( "windowsTerminal.enabledDirectoryOption" ) ;
export const defaultDirectory = new Config . Entry < string > ( "windowsTerminal.defaultDirectory" ) ;
export const defaultOptions = new Config . Entry < string > ( "windowsTerminal.defaultOptions" ) ;
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
module StatusBarItem
{
    const create =
    (
        properties :
        {
            alignment ? : vscode . StatusBarAlignment ,
            text ? : string ,
            command ? : string ,
            tooltip ? : string
        }
    )
    : vscode . StatusBarItem =>
    {
        const result = vscode . window . createStatusBarItem ( properties . alignment );
        if ( undefined !== properties . text )
        {
            result . text = properties . text;
        }
        if ( undefined !== properties . command )
        {
            result . command = properties . command ;
        }
        if ( undefined !== properties . tooltip )
        {
            result . tooltip = properties . tooltip ;
        }
        return result ;
    };
    let statusBarItem: vscode.StatusBarItem;
    export const make = ( ) => statusBarItem = create
    ({
        alignment : statusBarAlignment . get ( "" ) ,
        text : statusBarText . get ( "" ) ,
        command : statusBarCommand . getKey ( "" ) ,
        tooltip : statusBarCommand . get ( "" ) ,
    });
    export const update = ( ) : void =>
    {
        statusBarItem . text = statusBarText . get ( "" ) ;
        statusBarItem . command = statusBarCommand . getKey ( "" ) ;
        statusBarItem . tooltip = statusBarCommand . get ( "" ) ;
        statusBarItem . show ( );
    };
}
export const getStoreUri = ( ) => vscode.Uri.parse ( "https://www.microsoft.com/ja-jp/p/windows-terminal-preview/9n0dx20hk701" ) ;
export const getDocumentUri = ( ) => vscode.Uri.parse ( "https://github.com/microsoft/terminal/tree/master/doc/user-docs" ) ;
export const getSettingsJsonPath = async ( ) =>
{
    const config = settingsJsonPath . get ( "" ) ;
    if ( null !== config && "" !== config )
    {
        return config;
    }
    // settings.json のパスは決め打ちで良いっぽい。 https://github.com/microsoft/terminal/blob/master/doc/user-docs/UsingJsonSettings.md
    return `${ process . env [ "LOCALAPPDATA" ] }\\Packages\\Microsoft.WindowsTerminal_8wekyb3d8bbwe\\LocalState\\settings.json` ;
} ;
export const getCurrentFolder = ( ) =>
    vscode . workspace . workspaceFolders &&
    0 < vscode . workspace . workspaceFolders . length ?
        vscode . workspace . workspaceFolders [ 0 ] . uri . fsPath :
        null ;
export const parseJsonWithComment = ( json : string ) => JSON . parse
(
    json . replace ( /^\s*(\/\/.*)$/gm , "" )
);
export const getSettingsJsonDocument = async ( ) => await vscode . workspace . openTextDocument
(
    await getSettingsJsonPath ( )
) ;
export const getSettings = async ( ) => < SettingsJson > parseJsonWithComment
(
    (
        await getSettingsJsonDocument ( )
    )
    . getText ( )
);
export const makeProfileParam = ( profile : string | null ) => profile ? ` -p ${ profile }` : "" ;
export const makeDirectoryParam = ( directory : string | null ) => directory ? ` -d ${ directory }` : "" ;
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
        defaultOptions . get ( "" ) ?? "",
        makeProfileParam ( data . profile ?? defaultProfile . get ( "" ) ) ,
        makeDirectoryParam
        (
            data . directory ??
            enabledDirectoryOption . get ( "" ) ?
                ( defaultDirectory . get ( "" ) ?? getCurrentFolder ( ) ) :
                null
        ) ,
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
        'windowsTerminal.showDocument' ,
        async ( ) => await vscode . env . openExternal ( getDocumentUri ( ) )
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
                    await getSettings()
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
        async ( ) => await vscode . window . showTextDocument ( await getSettingsJsonDocument ( ) )
    ),
    vscode . workspace . onDidChangeConfiguration
    (
        event =>
        {
            [
                settingsJsonPath ,
                defaultProfile ,
                enabledDirectoryOption ,
                defaultDirectory ,
                defaultOptions ,
                statusBarAlignment ,
            ]
            . map ( i => i . onDidChangeConfiguration ( event . affectsConfiguration ) ) ;
            if
            (
                [
                    statusBarText ,
                    statusBarCommand ,
                ]
                . map ( i => i . onDidChangeConfiguration ( event . affectsConfiguration ) )
                . reduce ( ( a , b ) => a || b , true )
            )
            {
                StatusBarItem . update ( ) ;
            }
        }
    ),
    StatusBarItem . make ( )
) ;
export const deactivate = ( ) => { } ;
