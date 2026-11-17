#define MyAppName "Fabric 3D"
#define MyAppVersion "0.2.0"
#define MyAppPublisher "H4D1AM"
#define MyAppExeName "Fabric 3D.exe"
[Setup]
AppId={{C4D5B26A-3C12-4F89-9E43-6E79B0C7A3F1}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\Fabric 3D
DefaultGroupName={#MyAppName}
OutputDir=dist
OutputBaseFilename=Fabric-3D-Setup-v{#MyAppVersion}
SetupIconFile=fabric3d_icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
ArchitecturesInstallIn64BitMode=x64
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"
[Files]
Source: "dist\Fabric 3D.exe"; DestDir: "{app}"; Flags: ignoreversion
[Icons]
Name: "{group}\Fabric 3D"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\Fabric 3D"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch Fabric 3D"; Flags: postinstall nowait skipifsilent
