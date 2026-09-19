; CEA Desktop installer customizations.
;
; Adds two things beyond electron-builder's defaults, so both the user and we
; have visibility when an install fails - previously the only signal was a
; bare numeric exit code:
;
;  1. A breadcrumb log at %APPDATA%\<product>\logs\installer.log, appended to
;     as each stage completes. It is written progressively, not just at a
;     final success/failure point, because several of electron-builder's own
;     failure paths call `Quit` directly (e.g. a locked app file during
;     extraction) rather than going through a hook we could catch - a log
;     that stops partway through tells us exactly which stage died.
;  2. Anonymous PostHog telemetry (build/telemetry.ps1), covering standalone
;     installs and auto-updates that the outer CityEnergyAnalyst installer
;     never sees. An install launched from that outer installer is marked
;     with /CEABUNDLE on the command line; for those, only failures are
;     reported here, since the outer installer's own telemetry already
;     counts the successful/bundled case. See setup/cityenergyanalyst.nsi and
;     setup/telemetry.ps1 in the CityEnergyAnalyst repo for the consumer.
;
; Both are best-effort: a failure to open the log or send telemetry is always
; swallowed and never blocks or fails the install.

!include "FileFunc.nsh"
!include /NONFATAL "telemetry-key.nsh" ; defines POSTHOG_API_KEY when CI supplied one; local/fork builds omit it

!define POSTHOG_HOST "https://eu.i.posthog.com/capture/"

!macro customHeader
  Var CeaLog             ; path to installer.log
  Var CeaLogMsg           ; message ceaLogWrite appends next
  Var CeaInstallSource     ; cea_installer | auto_update | standalone

  ; Appends one timestamped line ($CeaLogMsg) to $CeaLog. Does nothing if the
  ; log can't be opened (locked, no permissions, directory missing) - logging
  ; must never break the install. Clobbers $R0-$R7; callers that need a
  ; register's value afterwards must capture it into a named Var first.
  Function ceaLogWrite
    ClearErrors
    FileOpen $R0 "$CeaLog" a
    IfErrors ceaLogWrite_done
    FileSeek $R0 0 END
    ${GetTime} "" "L" $R1 $R2 $R3 $R4 $R5 $R6 $R7
    FileWrite $R0 "$R3-$R2-$R1 $R5:$R6:$R7 [${VERSION}] [$CeaInstallSource] $CeaLogMsg$\r$\n"
    FileClose $R0
    ceaLogWrite_done:
    ClearErrors
  FunctionEnd
!macroend

; Fire-and-forget anonymous telemetry, mirroring setup/telemetry.ps1's outer
; installer pattern: launched detached via plain Exec (never ExecWait), so a
; stalled connection can't delay or block the install; the actual POST is
; wrapped in try/catch with a short timeout inside telemetry.ps1.
;
; Skipped when this run was launched from the outer CEA installer (source
; cea_installer) AND is reporting success - that installer already counts
; the bundled, successful case via its own telemetry. Every other
; combination (a bundled failure, or any outcome for a standalone install or
; an auto-update, neither of which the outer installer ever sees) is sent.
!macro ceaSendTelemetry EventName Stage ErrorCode
  !ifdef POSTHOG_API_KEY
    ${If} $CeaInstallSource != "cea_installer"
    ${OrIf} "${EventName}" == "gui_install_failed"
      ${If} ${FileExists} "$TEMP\cea-gui-telemetry.ps1"
        Exec '"$WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "$TEMP\cea-gui-telemetry.ps1" -ApiKey "${POSTHOG_API_KEY}" -PostHogHost "${POSTHOG_HOST}" -EventName "${EventName}" -GuiVersion "${VERSION}" -InstallSource "$CeaInstallSource" -Stage "${Stage}" -ErrorCode "${ErrorCode}"'
      ${EndIf}
    ${EndIf}
  !endif
!macroend

!macro preInit
    ; Checks if custom install path is provided using the /D flag and sets the provided path.
    ; Only write to registry when manually installed and not updated.
    ${ifNot} ${isUpdated}
        ${if} $InstDir != ""
            ; /D was used, set install path to /D
            SetRegView 64
            WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$InstDir"
            WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$InstDir"
            SetRegView 32
            WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$InstDir"
            WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$InstDir"
        ${endIf}
    ${endIf}

    ; --- breadcrumb log + telemetry provenance, added for install visibility ---
    ${GetParameters} $R0
    ${GetOptions} $R0 "/CEABUNDLE" $R1
    ${IfNot} ${Errors}
        StrCpy $CeaInstallSource "cea_installer"
    ${ElseIf} ${isUpdated}
        StrCpy $CeaInstallSource "auto_update"
    ${Else}
        StrCpy $CeaInstallSource "standalone"
    ${EndIf}
    ClearErrors

    StrCpy $CeaLog "$APPDATA\${PRODUCT_FILENAME}\logs\installer.log"
    CreateDirectory "$APPDATA\${PRODUCT_FILENAME}\logs"

    ; keep the log from growing without bound across repeated installs/updates
    ClearErrors
    FileOpen $R0 "$CeaLog" r
    ${IfNot} ${Errors}
        FileSeek $R0 0 END $R1
        FileClose $R0
        ${If} $R1 > 262144
            Delete "$CeaLog"
        ${EndIf}
    ${EndIf}
    ClearErrors

    StrCpy $CeaLogMsg "---- run: version=${VERSION} ----"
    Call ceaLogWrite
    StrCpy $CeaLogMsg "stage=init"
    Call ceaLogWrite
!macroend

!macro customInit
    StrCpy $CeaLogMsg "stage=init_done mode=$MultiUser.InstallMode silent=${Silent}"
    Call ceaLogWrite

    ; stage the telemetry script now, before extraction (the step most likely
    ; to fail) so it is already on disk if a later stage needs to report a
    ; failure. Extracted straight to $TEMP, not $PLUGINSDIR, which NSIS wipes
    ; as soon as this process exits - the detached PowerShell process launched
    ; by ceaSendTelemetry must be able to outlive it.
    !ifdef POSTHOG_API_KEY
        File "/oname=$TEMP\cea-gui-telemetry.ps1" "telemetry.ps1"
    !endif
!macroend

!macro customFiles_x64
    StrCpy $CeaLogMsg "stage=extracted"
    Call ceaLogWrite
!macroend

!macro customInstall
    StrCpy $CeaLogMsg "stage=installed"
    Call ceaLogWrite
    !insertmacro ceaSendTelemetry "gui_install_completed" "installed" ""
!macroend

; Replaces electron-builder's default handling of a previous version failing
; to uninstall (installUtil.nsh's handleUninstallResult), so we can log and
; report it - reproducing that default's behavior (MessageBox + SetErrorLevel
; 2 + Quit) exactly, since simply not doing so would silently install over a
; broken previous version.
;
; Uses $R9 rather than a dedicated Var to survive the Call ceaLogWrite below
; (which clobbers $R0-$R7): electron-builder compiles this script twice, once
; normally and once with BUILD_UNINSTALLER defined for the small embedded
; uninstaller stub, and in that second pass installSection.nsh (the only
; caller of this macro) is never included - a dedicated Var would then be
; declared (via customHeader, inserted in both passes) but never referenced
; in that pass, and electron-builder builds NSIS with warnings-as-errors, so
; that "unreferenced variable" warning fails the whole build. $R0-$R9 are
; NSIS's built-in registers, not user Vars, so they're exempt from that check.
!macro ceaHandleOldUninstallCheck
    ${If} ${Errors}
        StrCpy $CeaLogMsg "stage=old_uninstall_check launch_failed"
        Call ceaLogWrite
        DetailPrint `Uninstall was not successful. Not able to launch uninstaller!`
    ${Else}
        StrCpy $R9 $R0
        StrCpy $CeaLogMsg "stage=old_uninstall_check code=$R9"
        Call ceaLogWrite
        ${If} $R9 != 0
            MessageBox MB_OK|MB_ICONEXCLAMATION "$(uninstallFailed): $R9"
            DetailPrint `Uninstall was not successful. Uninstaller error code: $R9.`
            !insertmacro ceaSendTelemetry "gui_install_failed" "old_uninstall_check" "$R9"
            SetErrorLevel 2
            Quit
        ${EndIf}
    ${EndIf}
!macroend

!macro customUnInstallCheck
    !insertmacro ceaHandleOldUninstallCheck
!macroend

!macro customUnInstallCheckCurrentUser
    !insertmacro ceaHandleOldUninstallCheck
!macroend
