#define MyAppName "Pudu ADB Agent"
#ifndef MyAppVersion
  #define MyAppVersion "0.0.0"
#endif
#define MyAppPublisher "Pudu"
#define MyAppExeName "adb-agent.exe"

[Setup]
AppId={{B4B8F7E4-9AC0-4A88-93D5-DBD0F7A94A1D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\Pudu\AdbAgent
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesInstallIn64BitMode=x64
OutputDir=..\dist
OutputBaseFilename=adb-agent-setup
Compression=lzma
SolidCompression=yes
Uninstallable=yes
WizardStyle=modern
CloseApplications=yes
RestartApplications=no

[Files]
Source: "..\dist\adb-agent.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\dist\adb.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\dist\AdbWinApi.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\dist\AdbWinUsbApi.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--no-browser"

[Registry]
Root: HKCU; Subkey: "Software\Classes\pudu-agent"; ValueType: string; ValueName: ""; ValueData: "URL:Pudu Agent Protocol"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\pudu-agent"; ValueType: string; ValueName: "URL Protocol"; ValueData: ""; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Classes\pudu-agent\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#MyAppExeName}"" --protocol-start --no-browser ""%1"""

[Run]
Filename: "{app}\{#MyAppExeName}"; Parameters: "--no-browser"; Description: "启动现场连接助手"; Flags: nowait postinstall skipifsilent
