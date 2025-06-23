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
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Template, TemplateColumn } from "./spreadsheet-processor"

interface TemplatesManagerProps {
  templates: Template[]
  onAddTemplate: (file: File, name: string, useSecondRowAsConstants: boolean) => void
  onUpdateTemplate: (id: string, updates: Partial<Template>) => void
  onDeleteTemplate: (id: string) => void
  onExportTemplate: (id: string, format: "csv" | "xlsx") => void
  onUpdateTemplateColumn: (templateId: string, columnName: string, updates: Partial<TemplateColumn>) => void
}

export function TemplatesManager({
  templates,
  onAddTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onExportTemplate,
  onUpdateTemplateColumn,
}: TemplatesManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)
  const [isEditColumnDialogOpen, setIsEditColumnDialogOpen] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState("")
  const [newTemplateFile, setNewTemplateFile] = useState<File | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)
  const [editingColumn, setEditingColumn] = useState<{
    templateId: string
    columnName: string
    constant: string | null
  }>({
    templateId: "",
    columnName: "",
    constant: null,
  })
  const [error, setError] = useState<string | null>(null)
  const [useSecondRowAsConstants, setUseSecondRowAsConstants] = useState(false)

  const handleAddTemplate = () => {
    if (!newTemplateName.trim() || !newTemplateFile) return

    onAddTemplate(newTemplateFile, newTemplateName, useSecondRowAsConstants)
    setNewTemplateName("")
    setNewTemplateFile(null)
    setUseSecondRowAsConstants(false)
    setIsAddDialogOpen(false)
  }

  const handleUpdateTemplate = () => {
    if (!editingTemplate || !editingTemplate.name.trim()) return

    onUpdateTemplate(editingTemplate.id, {
      name: editingTemplate.name,
      lastEditedDateTime: new Date().toISOString(),
    })
    setEditingTemplate(null)
    setIsEditDialogOpen(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setNewTemplateFile(e.target.files[0])
    }
  }

  const handleUpdateColumn = () => {
    if (!editingColumn.templateId || !editingColumn.columnName) return

    onUpdateTemplateColumn(editingColumn.templateId, editingColumn.columnName, {
      constant: editingColumn.constant === "" ? null : editingColumn.constant,
    })
    setIsEditColumnDialogOpen(false)
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  return (
    <Card className="bg-blue-50">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            Templates <span className="ml-2 text-sm text-muted-foreground">({templates.length})</span>
          </h3>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Template</DialogTitle>
                <DialogDescription>Upload a spreadsheet with header row only to use as a template.</DialogDescription>
              </DialogHeader>
              {error && (
                <Alert variant="destructive" className="mt-2">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="template-name">Template Name</Label>
                  <Input
                    id="template-name"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="Enter template name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="template-file">Upload File</Label>
                  <Input id="template-file" type="file" onChange={handleFileChange} accept=".csv,.xlsx,.xls,.txt" />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="use-second-row"
                    type="checkbox"
                    checked={useSecondRowAsConstants}
                    onChange={(e) => setUseSecondRowAsConstants(e.target.checked)}
                  />
                  <Label htmlFor="use-second-row">Use second row as constants</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddTemplate} disabled={!newTemplateName.trim() || !newTemplateFile}>
                  Add Template
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {templates.length === 0 ? (
          <div className="border rounded-md p-8 text-center bg-white">
            <p className="text-gray-500">No templates added yet</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {templates.map((template) => (
              <div key={template.id} className="border rounded-md p-4 bg-white">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-medium">{template.name}</h4>
                    <p className="text-sm text-gray-500">{template.columns.length} columns</p>
                    {template.uploadDateTime && (
                      <p className="text-xs text-gray-500">
                        Uploaded: {formatDate(template.uploadDateTime)}
                        {template.lastEditedDateTime && ` • Last edited: ${formatDate(template.lastEditedDateTime)}`}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingTemplate(template)
                        setIsEditDialogOpen(true)
                      }}
                    >
                      Rename
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => onDeleteTemplate(template.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => onExportTemplate(template.id, "csv")}>
                      <Download className="h-4 w-4 mr-2" />
                      Export as CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onExportTemplate(template.id, "xlsx")}>
                      <Download className="h-4 w-4 mr-2" />
                      Export as Excel
                    </Button>
                  </div>

                  {/* Inline Preview */}
                  <div className="border rounded-md">
                    <div className="bg-muted p-2 text-sm font-medium">Preview</div>
                    <div className="max-w-[1000px] overflow-x-auto">
                       <div className="h-[200px] overflow-y-auto">
                        <Table className="min-w-[800px] w-full">
                          <TableHeader>
                            <TableRow>
                              {template.columns.map((column) => (
                                <TableHead key={column.name} className="text-center min-w-[120px]">
                                  {column.name}
                                </TableHead>
                              ))}
                            </TableRow>
                            <TableRow>
                              {template.columns.map((column) => (
                                <TableHead key={`${column.name}-edit`} className="text-center p-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6"
                                    onClick={() => {
                                      setEditingColumn({
                                        templateId: template.id,
                                        columnName: column.name,
                                        constant: column.constant,
                                      })
                                      setIsEditColumnDialogOpen(true)
                                    }}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                </TableHead>
                              ))}
                            </TableRow>
                            <TableRow>
                              {template.columns.map((column) => (
                                <TableHead key={`${column.name}-type`} className="text-xs font-normal text-center">
                                  {column.constant !== null ? "Constant" : "Mappable"}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              {template.columns.map((column) => (
                                <TableCell
                                  key={column.name}
                                  className={
                                    column.constant !== null
                                      ? "bg-blue-50 text-center min-w-[120px]"
                                      : "text-center text-gray-400 min-w-[120px]"
                                  }
                                >
                                  {column.constant !== null ? column.constant : "—"}
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableBody>
                        </Table>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-template-name">Template Name</Label>
              <Input
                id="edit-template-name"
                value={editingTemplate?.name || ""}
                onChange={(e) => setEditingTemplate((prev) => (prev ? { ...prev, name: e.target.value } : null))}
                placeholder="Enter template name"
              />
            </div>
            {editingTemplate?.uploadDateTime && (
              <div className="text-xs text-gray-500">
                <p>Uploaded: {formatDate(editingTemplate.uploadDateTime)}</p>
                {editingTemplate.lastEditedDateTime && (
                  <p>Last edited: {formatDate(editingTemplate.lastEditedDateTime)}</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTemplate} disabled={!editingTemplate?.name.trim()}>
              Update Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Template Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Preview: {previewTemplate?.name}</DialogTitle>
            {previewTemplate?.uploadDateTime && (
              <DialogDescription>
                Uploaded: {formatDate(previewTemplate.uploadDateTime)}
                {previewTemplate.lastEditedDateTime &&
                  ` • Last edited: ${formatDate(previewTemplate.lastEditedDateTime)}`}
              </DialogDescription>
            )}
          </DialogHeader>
          {previewTemplate && (
            <div className="max-w-[1000px] overflow-x-auto">
              <div className="h-[400px] overflow-y-auto">
                <Table className="min-w-[800px] w-full">
                  <TableHeader>
                    <TableRow>
                      {previewTemplate.columns.map((column) => (
                        <TableHead key={column.name} className="text-center min-w-[120px]">
                          {column.name}
                        </TableHead>
                      ))}
                    </TableRow>
                    <TableRow>
                      {previewTemplate.columns.map((column) => (
                        <TableHead key={`${column.name}-edit`} className="text-center p-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6"
                            onClick={() => {
                              setEditingColumn({
                                templateId: previewTemplate.id,
                                columnName: column.name,
                                constant: column.constant,
                              })
                              setIsEditColumnDialogOpen(true)
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </TableHead>
                      ))}
                    </TableRow>
                    <TableRow>
                      {previewTemplate.columns.map((column) => (
                        <TableHead key={`${column.name}-type`} className="text-xs font-normal text-center">
                          {column.constant !== null ? "Constant" : "Mappable"}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      {previewTemplate.columns.map((column) => (
                        <TableCell
                          key={column.name}
                          className={
                            column.constant !== null
                              ? "bg-blue-50 text-center min-w-[120px]"
                              : "text-center text-gray-400 min-w-[120px]"
                          }
                        >
                          {column.constant !== null ? column.constant : "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Column Dialog */}
      <Dialog open={isEditColumnDialogOpen} onOpenChange={setIsEditColumnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Column: {editingColumn.columnName}</DialogTitle>
            <DialogDescription>Set a constant value for this column or leave empty to map data.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="column-constant">Constant Value (optional)</Label>
              <Input
                id="column-constant"
                value={editingColumn.constant === null ? "" : editingColumn.constant}
                onChange={(e) => setEditingColumn((prev) => ({ ...prev, constant: e.target.value }))}
                placeholder="Leave empty to map data"
              />
              <p className="text-xs text-gray-500">
                If you set a constant, this column will be filled with this value and cannot be mapped to processed
                data.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditColumnDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateColumn}>Update Column</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
