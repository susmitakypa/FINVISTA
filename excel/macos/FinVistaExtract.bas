Attribute VB_Name = "FinVistaExtract"
Option Explicit

' Mac Excel helper. Do not use VBA Open/Kill/MkDir on POSIX paths (Run-time error 75).
' Install first: excel/macos/Install-Excel-Helper.command then quit and reopen Excel.

Public Sub SendScreenerToFinVista()
    Dim apiKey As String
    Dim result As String

    apiKey = InputBox("Enter your FINVISTA_API_KEY (same value as Vercel).", "FinVista Extract")
    If Len(Trim$(apiKey)) = 0 Then Exit Sub

    #If Mac Then
        On Error GoTo InstallHelper
        result = AppleScriptTask("FinVistaExtract.applescript", "ChooseAndUpload", apiKey)
        If result = "CANCELLED" Then Exit Sub
        MsgBox result, vbInformation, "FinVista Extract"
        Exit Sub
InstallHelper:
        MsgBox "Excel on Mac cannot send the file until the helper is installed." & vbNewLine & vbNewLine & _
               "1. Double-click excel/macos/Install-Excel-Helper.command" & vbNewLine & _
               "2. Quit Excel completely" & vbNewLine & _
               "3. Reopen this workbook and run SendScreenerToFinVista again.", vbCritical, "FinVista Extract"
    #Else
        MsgBox "This macro is for Microsoft Excel on macOS.", vbExclamation, "FinVista Extract"
    #End If
End Sub
