"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Edit, Plus, Trash2 } from "lucide-react"
import type { SupportSheet } from "./spreadsheet-processor"
import { useDragAndDropFile } from "@/hooks/use-drag-and-drop-file"

interface SupportSheetsManagerProps {
  supportSheets: SupportSheet[]
  onAddSheet: (file: File, name: string) => void
  onUpdateSheet: (id: string, updates: Partial<SupportSheet>) => void
  onDeleteSheet: (id: string) => void
  onExportSheet: (id: string, format: "csv" | "xlsx") => void
}

export function SupportSheetsManager({
  supportSheets,
  onAddSheet,
  onUpdateSheet,
  onDeleteSheet,
  onExportSheet,
}: SupportSheetsManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)
  const [newSheetName, setNewSheetName] = useState("")
  const [newSheetFile, setNewSheetFile] = useState<File | null>(null)
  const [editingSheet, setEditingSheet] = useState<SupportSheet | null>(null)
  const [previewSheet, setPreviewSheet] = useState<SupportSheet | null>(null)

  const {
    isDragging: isDraggingSheet,
    handleDragOver: handleSheetDragOver,
    handleDragLeave: handleSheetDragLeave,
    handleDrop: handleSheetDrop,
  } = useDragAndDropFile((files) => {
    if (files.length > 0) {
      setNewSheetFile(files[0])
    }
  })

  const handleAddSheet = () => {
    if (!newSheetName.trim() || !newSheetFile) return

    onAddSheet(newSheetFile, newSheetName)
    setNewSheetName("")
    setNewSheetFile(null)
    setIsAddDialogOpen(false)
  }

  const handleUpdateSheet = () => {
    if (!editingSheet || !editingSheet.name.trim()) return

    onUpdateSheet(editingSheet.id, {
      name: editingSheet.name,
      lastEditedDateTime: new Date().toISOString(),
    })
    setEditingSheet(null)
    setIsEditDialogOpen(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setNewSheetFile(e.target.files[0])
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  return (
    <Card className="bg-blue-50">
      <CardContent className="pt-6">
        <div className="grid gap-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              Support Sheets <span className="ml-2 text-sm text-muted-foreground">({supportSheets.length})</span>
            </h3>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Support Sheet
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Support Sheet</DialogTitle>
                  <DialogDescription>Upload a spreadsheet to use for lookups and other operations.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="sheet-name">Sheet Name</Label>
                    <Input
                      id="sheet-name"
                      value={newSheetName}
                      onChange={(e) => setNewSheetName(e.target.value)}
                      placeholder="Enter sheet name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sheet-file">Upload File</Label>
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors bg-white ${
                        isDraggingSheet ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary"
                      }`}
                      onDragOver={handleSheetDragOver}
                      onDragLeave={handleSheetDragLeave}
                      onDrop={handleSheetDrop}
                      onClick={() => document.getElementById("sheet-file")?.click()}
                    >
                      <span className="block text-gray-600 mb-2">Drag and drop your file here, or click to browse</span>
                      <span className="block text-xs text-gray-500">Supported formats: CSV, Excel, TXT</span>
                      {newSheetFile && (
                        <div className="mt-2 text-sm text-blue-700">Selected: {newSheetFile.name}</div>
                      )}
                      <input
                        id="sheet-file"
                        type="file"
                        onChange={handleFileChange}
                        accept=".csv,.xlsx,.xls,.txt"
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddSheet} disabled={!newSheetName.trim() || !newSheetFile}>
                    Add Sheet
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {supportSheets.length === 0 ? (
            <div
              className={`border-2 border-dashed rounded-md p-8 text-center bg-white cursor-pointer transition-colors ${
                isDraggingSheet ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary"
              }`}
              onDragOver={handleSheetDragOver}
              onDragLeave={handleSheetDragLeave}
              onDrop={e => {
                handleSheetDrop(e);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  const file = e.dataTransfer.files[0];
                  setNewSheetFile(file);
                  const name = file.name.replace(/\.[^/.]+$/, "");
                  setNewSheetName(name);
                  setIsAddDialogOpen(true);
                }
              }}
              onClick={() => setIsAddDialogOpen(true)}
            >
              <span className="block text-gray-600 mb-2">No support sheets added yet</span>
              <span className="block text-xs text-gray-500">Drag and drop a file here, or click to add</span>
            </div>
          ) : (
            <div className="grid gap-4">
              {supportSheets.map((sheet) => (
                <div key={sheet.id} className="border rounded-md p-4 bg-white">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-medium">{sheet.name}</h4>
                      <p className="text-sm text-gray-500">
                        {sheet.columns.length} columns, {sheet.data.length} rows
                      </p>
                      {sheet.uniqueId && (
                        <p className="text-xs text-gray-500">
                          ID: {sheet.uniqueId}
                          {sheet.uploadDateTime && ` • Uploaded: ${formatDate(sheet.uploadDateTime)}`}
                          {sheet.lastEditedDateTime && ` • Last edited: ${formatDate(sheet.lastEditedDateTime)}`}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPreviewSheet(sheet)
                          setIsPreviewDialogOpen(true)
                        }}
                      >
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setEditingSheet(sheet)
                          setIsEditDialogOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => onDeleteSheet(sheet.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => onExportSheet(sheet.id, "csv")}>
                      <Download className="h-4 w-4 mr-2" />
                      Export as CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onExportSheet(sheet.id, "xlsx")}>
                      <Download className="h-4 w-4 mr-2" />
                      Export as Excel
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Edit Sheet Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Support Sheet</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-sheet-name">Sheet Name</Label>
              <Input
                id="edit-sheet-name"
                value={editingSheet?.name || ""}
                onChange={(e) => setEditingSheet((prev) => (prev ? { ...prev, name: e.target.value } : null))}
                placeholder="Enter sheet name"
              />
            </div>
            {editingSheet?.uniqueId && (
              <div className="text-xs text-gray-500">
                <p>ID: {editingSheet.uniqueId}</p>
                {editingSheet.uploadDateTime && <p>Uploaded: {formatDate(editingSheet.uploadDateTime)}</p>}
                {editingSheet.lastEditedDateTime && <p>Last edited: {formatDate(editingSheet.lastEditedDateTime)}</p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSheet} disabled={!editingSheet?.name.trim()}>
              Update Sheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Sheet Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Preview: {previewSheet?.name}</DialogTitle>
            {previewSheet?.uniqueId && (
              <DialogDescription>
                ID: {previewSheet.uniqueId}
                {previewSheet.uploadDateTime && ` • Uploaded: ${formatDate(previewSheet.uploadDateTime)}`}
                {previewSheet.lastEditedDateTime && ` • Last edited: ${formatDate(previewSheet.lastEditedDateTime)}`}
              </DialogDescription>
            )}
          </DialogHeader>
          {previewSheet && (
            <div style={{ width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
              <div className="h-[400px] overflow-auto" style={{ width: "100%", maxWidth: "100%" }}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-20 w-[60px]">#</TableHead>
                      {previewSheet.columns.map((column) => (
                        <TableHead key={column}>{column}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewSheet.data.slice(0, 30).map((row, rowIndex) => (
                      <TableRow key={rowIndex} className={rowIndex % 2 === 0 ? "bg-muted/50" : ""}>
                        <TableCell className="sticky left-0 bg-background z-10">{rowIndex + 1}</TableCell>
                        {previewSheet.columns.map((column) => (
                          <TableCell key={column}>{row[column]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
