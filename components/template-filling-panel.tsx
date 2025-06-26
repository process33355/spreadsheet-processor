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

  const handleColumnMappingChange = (templateColumn: string, value: string | null) => {
    onColumnMappingChange(templateColumn, value)
  }

  // Get the mapped processed column or constant for a template column
  const getMappedColumn = (templateColumn: string) => {
    if (!templateMapping || !templateMapping.columnMappings) return null
    return templateMapping.columnMappings[templateColumn] || null
  }

  // Helper to check if a value is a constant
  const isConstantValue = (val: string | null) => val && val.startsWith("CONST:")
  const getConstantValue = (val: string | null) => (val ? val.replace(/^CONST:/, "") : "")

  return (
    <Card className="bg-blue-50">
      <CardContent className="pt-6">
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="template-select">Select Template</Label>
            <Select value={templateMapping?.templateId || "none"} onValueChange={handleTemplateChange}>
              <SelectTrigger id="template-select" className="min-w-[260px] max-w-[400px] truncate">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id} className="text-sm max-w-[350px] truncate">
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
                Map processed columns to template columns, or set a constant value from the template. Columns with constants in the template file cannot be changed.
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
                                onValueChange={(value) => handleColumnMappingChange(column.name, value === "none" ? null : value)}
                              >
                                <SelectTrigger className="min-w-[180px] max-w-[320px] text-xs">
                                  <SelectValue placeholder="Select column or constant" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[400px] min-w-[220px] text-xs">
                                  <SelectItem value="none" className="text-xs">None</SelectItem>
                                  <div className="px-2 py-1 text-xs text-gray-500">Processed Columns</div>
                                  {processedColumns.map((procColumn) => (
                                    <SelectItem key={procColumn} value={procColumn} className="text-xs max-w-[300px] truncate">
                                      {procColumn}
                                    </SelectItem>
                                  ))}
                                  {selectedTemplate.valueOptions && selectedTemplate.valueOptions[column.name] && selectedTemplate.valueOptions[column.name].length > 0 && (
                                    <>
                                      <div className="px-2 py-1 text-xs text-gray-500">Constants from Template Rows 5-500</div>
                                      {selectedTemplate.valueOptions[column.name].map((val) => (
                                        <SelectItem key={val} value={`CONST:${val}`} className="text-xs max-w-[300px] truncate">
                                          {val}
                                        </SelectItem>
                                      ))}
                                    </>
                                  )}
                                </SelectContent>
                              </Select>
                            )}
                            {/* Show selected constant if set */}
                            {isConstantValue(getMappedColumn(column.name)) && (
                              <div className="text-xs text-blue-700 mt-1">Constant: {getConstantValue(getMappedColumn(column.name))}</div>
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
                    Some template columns are not mapped or set to a constant. They will be empty in the output.
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
