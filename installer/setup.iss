; TrajectIQ Enterprise Installer Script
; ======================================
; Inno Setup script for Windows installer

#define MyAppName "TrajectIQ Enterprise"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "TrajectIQ"
#define MyAppURL "https://trajectiq.com"
#define MyAppExeName "TrajectIQ.exe"

[Setup]
AppId={{8A7C9F3D-2E5B-4A1C-B8D6-7F3E9C2A5B8D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
LicenseFile=..\LICENSE
InfoBeforeFile=..\README.md
OutputDir=..\dist
OutputBaseFilename=TrajectIQ-Setup-{#MyAppVersion}
SetupIconFile=..\assets\icon.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
MinVersion=10.0.17763
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

; Security settings
DisableWelcomePage=no
DisableDirPage=no
DisableProgramGroupPage=no
DisableReadyPage=no
DisableFinishedPage=no

; Uninstall settings
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName}
CreateUninstallRegKey=yes

; Additional files to include
[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.1; Check: not IsAdminInstallMode

[Files]
; Main executable
Source: "..\dist\TrajectIQ.exe"; DestDir: "{app}"; Flags: ignoreversion

; Data directory
Source: "..\data\*"; DestDir: "{app}\data"; Flags: ignoreversion recursesubdirs createallsubdirs; Check: DirExists(ExpandConstant('..\data'))

; Config templates
Source: "..\config\*"; DestDir: "{app}\config"; Flags: ignoreversion recursesubdirs createallsubdirs; Check: DirExists(ExpandConstant('..\config'))

; Documentation
Source: "..\README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\LICENSE"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\docs\*"; DestDir: "{app}\docs"; Flags: ignoreversion recursesubdirs createallsubdirs; Check: DirExists(ExpandConstant('..\docs'))

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:ProgramOnTheWeb,{#MyAppName}}"; Filename: "{#MyAppURL}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: quicklaunchicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Dirs]
; Create data directory with proper permissions
Name: "{app}\data"; Permissions: users-modify
Name: "{app}\logs"; Permissions: users-modify
Name: "{app}\backups"; Permissions: users-modify

[Registry]
; Add to installed programs with proper metadata
Root: HKLM; Subkey: "Software\{#MyAppName}"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}"; Flags: uninsdeletekey; Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\{#MyAppName}"; ValueType: string; ValueName: "Version"; ValueData: "{#MyAppVersion}"; Check: IsAdminInstallMode
Root: HKCU; Subkey: "Software\{#MyAppName}"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}"; Flags: uninsdeletekey; Check: not IsAdminInstallMode
Root: HKCU; Subkey: "Software\{#MyAppName}"; ValueType: string; ValueName: "Version"; ValueData: "{#MyAppVersion}"; Check: not IsAdminInstallMode

[Code]
// Check if floating license server should be installed
var
  InstallLicenseServer: Boolean;
  LicenseServerPage: TOutputMsgWizardPage;

procedure InitializeWizard;
begin
  // Create custom page for optional license server
  LicenseServerPage := CreateOutputMsgPage(
    wpSelectTasks,
    'Optional Components',
    'Floating License Server',
    'Would you like to install the TrajectIQ Floating License Server?' + #13#10 + #13#10 +
    'The license server allows multiple users to share a pool of licenses.' + #13#10 +
    'This is only needed for enterprise deployments with concurrent user limits.' + #13#10 + #13#10 +
    'Note: The license server runs as a Windows service on port 8080.'
  );
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := False;
  // Skip license server page for silent installs
  if (PageID = LicenseServerPage.ID) and WizardSilent then
    Result := True;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  
  // Handle license server page
  if CurPageID = LicenseServerPage.ID then
  begin
    InstallLicenseServer := True;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  DataDir: string;
begin
  if CurStep = ssPostInstall then
  begin
    // Create application data directory in user's profile
    DataDir := ExpandConstant('{userappdata}\TrajectIQ');
    
    if not DirExists(DataDir) then
      ForceDirectories(DataDir);
    
    // Create subdirectories
    ForceDirectories(DataDir + '\data');
    ForceDirectories(DataDir + '\logs');
    ForceDirectories(DataDir + '\backups');
    
    // Set permissions for data directory
    // (Windows handles this automatically for user profile directories)
    
    // Install floating license server if requested
    if InstallLicenseServer then
    begin
      // The license server installation would be handled here
      // For now, just log the request
      Log('Floating license server installation requested');
    end;
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  DataDir: string;
begin
  if CurUninstallStep = usPostUninstall then
  begin
    // Ask user if they want to remove data
    if MsgBox('Do you want to remove all TrajectIQ data files?', mbConfirmation, MB_YESNO) = IDYES then
    begin
      // Remove user data directory
      DataDir := ExpandConstant('{userappdata}\TrajectIQ');
      if DirExists(DataDir) then
        DelTree(DataDir, True, True, True);
    end;
  end;
end;

// Version comparison for updates
function GetVersionNum(const Version: String): Integer;
var
  Parts: TArrayOfString;
  i: Integer;
begin
  Result := 0;
  Parts := StrToArray(Version, '.');
  for i := 0 to Min(3, GetArrayLength(Parts) - 1) do
    Result := Result * 1000 + StrToIntDef(Parts[i], 0);
end;

// Check for existing installation
function InitializeSetup(): Boolean;
var
  OldVersion: String;
  Uninstall: String;
begin
  // Check for existing version
  if RegQueryStringValue(HKLM, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppName}_is1',
    'UninstallString', Uninstall) then
  begin
    if MsgBox('An existing installation of TrajectIQ was found. Do you want to uninstall it first?',
      mbConfirmation, MB_YESNO) = IDYES then
    begin
      Uninstall := RemoveQuotes(Uninstall);
      Exec(Uninstall, '/SILENT', '', SW_HIDE, ewWaitUntilTerminated, Result);
    end
    else
    begin
      Result := False;
      Exit;
    end;
  end;
  
  Result := True;
end;
