
Private Sub Worksheet_Change(ByVal Target As Range)

    Dim watchRange As Range
    Dim changedRange As Range
    Dim cell As Range
    Dim mergedRange As Range
    Dim helperSheet As Worksheet
    Dim helperCell As Range
    Dim targetWidth As Double
    Dim calculatedHeight As Double
    Dim i As Long
    Dim errorMessage As String

    On Error GoTo ErrorHandler

    ' Define the merged cells to monitor
    Set watchRange = Me.Range("D54:H54,D95:H95")

    ' Exit if the changed cells are outside the monitored range
    Set changedRange = Intersect(Target, watchRange)
    If changedRange Is Nothing Then Exit Sub

    Application.EnableEvents = False
    Application.ScreenUpdating = False

    ' Get or create the helper worksheet
    On Error Resume Next
    Set helperSheet = ThisWorkbook.Worksheets("_RowHeightHelper")
    On Error GoTo ErrorHandler

    If helperSheet Is Nothing Then
        Set helperSheet = ThisWorkbook.Worksheets.Add( _
            After:=ThisWorkbook.Worksheets( _
                ThisWorkbook.Worksheets.Count))

        helperSheet.Name = "_RowHeightHelper"
        helperSheet.Visible = xlSheetVeryHidden
    End If

    Set helperCell = helperSheet.Range("A1")

    ' Process each changed cell
    For Each cell In changedRange.Cells

        If cell.MergeCells Then

            Set mergedRange = cell.MergeArea

            ' Only process horizontally merged cells in a single row
            If mergedRange.Rows.Count = 1 Then

                If cell.Address = _
                    mergedRange.Cells(1, 1).Address Then

                    ' Copy the text and font properties
                    helperCell.Clear
                    helperCell.Value = cell.Value
                    helperCell.Font.Name = cell.Font.Name
                    helperCell.Font.Size = cell.Font.Size
                    helperCell.Font.Bold = cell.Font.Bold
                    helperCell.Font.Italic = cell.Font.Italic
                    helperCell.WrapText = True
                    helperCell.IndentLevel = 0

                    ' Get the width of the merged range
                    targetWidth = mergedRange.Width

                    ' Adjust the helper column width
                    helperSheet.Columns("A").ColumnWidth = 8

                    For i = 1 To 30

                        If Abs(helperSheet.Columns("A").Width _
                            - targetWidth) < 2 Then Exit For

                        If helperSheet.Columns("A").Width _
                            < targetWidth Then

                            helperSheet.Columns("A").ColumnWidth = _
                                Application.Min(255, _
                                helperSheet.Columns("A").ColumnWidth + _
                                (targetWidth - _
                                helperSheet.Columns("A").Width) / 7)

                        Else

                            helperSheet.Columns("A").ColumnWidth = _
                                Application.Max(1, _
                                helperSheet.Columns("A").ColumnWidth - _
                                (helperSheet.Columns("A").Width - _
                                targetWidth) / 7)

                        End If

                    Next i

                    ' Calculate the required row height
                    helperSheet.Rows(1).RowHeight = 15
                    helperSheet.Rows(1).AutoFit

                    calculatedHeight = _
                        helperSheet.Rows(1).RowHeight + 4

                    ' Limit the height to Excel's maximum row height
                    calculatedHeight = _
                        Application.Min(409.5, calculatedHeight)

                    ' Apply the calculated height
                    Me.Rows(mergedRange.Row).RowHeight = _
                        calculatedHeight

                    mergedRange.WrapText = True
                    mergedRange.VerticalAlignment = xlTop

                End If

            End If

        End If

    Next cell

CleanUp:

    On Error Resume Next

    If Not helperCell Is Nothing Then
        helperCell.Clear
    End If

    If Not helperSheet Is Nothing Then
        helperSheet.Visible = xlSheetVeryHidden
    End If

    Application.ScreenUpdating = True
    Application.EnableEvents = True

    Exit Sub

ErrorHandler:

    errorMessage = Err.Description

    MsgBox "Failed to adjust the row height: " & _
        errorMessage, vbExclamation, "Auto Row Height Error"

    Resume CleanUp

End Sub
