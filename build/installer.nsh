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
!macroend

!macro customRemoveFiles
   DetailPrint "Removing files..."
   RMDir /r $INSTDIR
!macroend

!macro customUnInstallCheck
   DetailPrint "Checking for uninstallation..."
   ${If} ${FileExists} "$INSTDIR\uninstall.exe"
       DetailPrint "Uninstall executable found."
   ${Else}
       DetailPrint "No uninstall executable found."
   ${EndIf}
!macroend