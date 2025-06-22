"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Template, TemplateMapping } from "./spreadsheet-processor"

interface TemplateFillingPanelProps {
  templates: Template[]
  processedColumns: string[]
  templateMapping: TemplateMapping | null
  onTemplateSelect: (templateId: string | null) => void
  onColumnMappingChange: (templateColumn: string, processedColumn: string | null) => void
}

export function TemplateFillingPanel({
  templates,
  processedColumns,
  templateMapping,
  onTemplateSelect,
  onColumnMappingChange,
}: TemplateFillingPanelProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)

  // Update selected template when templateMapping changes
  useEffect(() => {
    if (templateMapping && templateMapping.templateId) {
      const template = templates.find((t) => t.id === templateMapping.templateId)
      setSelectedTemplate(template || null)
    } else {
      setSelectedTemplate(null)
    }
  }, [templateMapping, templates])

  const handleTemplateChange = (templateId: string) => {
    onTemplateSelect(templateId === "none" ? null : templateId)
  }

  const handleColumnMappingChange = (templateColumn: string, processedColumn: string | null) => {
    onColumnMappingChange(templateColumn, processedColumn)
  }

  // Get the mapped processed column for a template column
  const getMappedColumn = (templateColumn: string) => {
    if (!templateMapping || !templateMapping.columnMappings) return null
    return templateMapping.columnMappings[templateColumn] || null
  }

  return (
    <Card className="bg-blue-50">
      <CardContent className="pt-6">
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="template-select">Select Template</Label>
            <Select value={templateMapping?.templateId || "none"} onValueChange={handleTemplateChange}>
              <SelectTrigger id="template-select" className="w-40">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTemplate ? (
            <div className="grid gap-4">
              <h3 className="text-lg font-semibold">Column Mapping</h3>
              <p className="text-sm text-gray-500">
                Map processed columns to template columns. Columns with constants cannot be mapped.
              </p>

              {/* Fixed height container with vertical scrolling */}
              <div className="border rounded-md h-[200px] overflow-y-auto">
                {/* Fixed width container with horizontal scrolling */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background z-20 w-[200px]">Column Type</TableHead>
                        {selectedTemplate.columns.map((column) => (
                          <TableHead key={column.name} className="min-w-[180px]">
                            {column.name}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium sticky left-0 bg-background z-10">Mapping</TableCell>
                        {selectedTemplate.columns.map((column) => (
                          <TableCell key={column.name}>
                            {column.constant !== null ? (
                              <div className="text-sm text-blue-600">Using constant value: {column.constant}</div>
                            ) : (
                              <Select
                                value={getMappedColumn(column.name) || "none"}
                                onValueChange={(value) =>
                                  handleColumnMappingChange(column.name, value === "none" ? null : value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select column" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {processedColumns.map((procColumn) => (
                                    <SelectItem key={procColumn} value={procColumn}>
                                      {procColumn}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {selectedTemplate.columns.some((c) => c.constant === null && !getMappedColumn(c.name)) && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <Info className="h-4 w-4 text-yellow-500" />
                  <AlertDescription className="text-yellow-700">
                    Some template columns are not mapped. They will be empty in the output.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="border rounded-md p-8 text-center">
              <p className="text-gray-500">Select a template to configure column mapping</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
