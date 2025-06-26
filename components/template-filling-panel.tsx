"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Template, TemplateMapping } from "./spreadsheet-processor"
import React from "react"

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
  const [search, setSearch] = useState("")
  const [customConstants, setCustomConstants] = useState<{ [column: string]: string }>({})

  // Update selected template when templateMapping changes
  useEffect(() => {
    if (templateMapping && templateMapping.templateId) {
      const template = templates.find((t) => t.id === templateMapping.templateId)
      setSelectedTemplate(template || null)
    } else {
      setSelectedTemplate(null)
    }
  }, [templateMapping, templates])

  // Sync customConstants with templateMapping changes
  useEffect(() => {
    if (!selectedTemplate) return
    const newCustomConstants: { [column: string]: string } = {}
    selectedTemplate.columns.forEach((column) => {
      const mapped = getMappedColumn(column.name)
      if (isConstantValue(mapped)) {
        newCustomConstants[column.name] = getConstantValue(mapped)
      }
    })
    setCustomConstants(newCustomConstants)
  }, [selectedTemplate, templateMapping])

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

  // Filtered processed columns and constants for dropdown
  const getFilteredOptions = (options: string[]) => {
    if (!search.trim()) return options
    return options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()))
  }

  const handleCustomConstantChange = (columnName: string, value: string) => {
    setCustomConstants((prev) => ({ ...prev, [columnName]: value }))
    if (value.trim() !== "") {
      onColumnMappingChange(columnName, `CONST:${value}`)
    } else {
      // If cleared, set mapping to null
      onColumnMappingChange(columnName, null)
    }
  }

  return (
    <Card className="bg-blue-50">
      <CardContent className="pt-6">
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="template-select">Select Template</Label>
            <Select value={templateMapping?.templateId || "none"} onValueChange={handleTemplateChange}>
              <SelectTrigger id="template-select" className="min-w-[260px] max-w-[300px] truncate">
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
                        {selectedTemplate.columns.map((column) => {
                          const mappedValue = getMappedColumn(column.name);
                          const isCustomConstant = !!customConstants[column.name] && customConstants[column.name].trim() !== "";
                          const valueOptions = selectedTemplate?.valueOptions?.[column.name] || [];
                          return (
                            <TableHead key={column.name} className="min-w-[180px]">
                              {column.name}
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium sticky left-0 bg-background z-10">Mapping</TableCell>
                        {selectedTemplate?.columns?.map((column) => {
                          const mappedValue = getMappedColumn(column.name);
                          const isCustomConstant = !!customConstants[column.name] && customConstants[column.name].trim() !== "";
                          const valueOptions = selectedTemplate?.valueOptions?.[column.name] || [];
                          return (
                            <TableCell key={column.name}>
                              {column.constant !== null ? (
                                <div className="text-sm text-blue-600">Using constant value: {column.constant}</div>
                              ) : (
                                <>
                                  <Select
                                    value={mappedValue || "none"}
                                    onValueChange={(value) => handleColumnMappingChange(column.name, value === "none" ? null : value)}
                                    disabled={isCustomConstant}
                                  >
                                    <SelectTrigger className="min-w-[180px] max-w-[320px] text-xs">
                                      <SelectValue placeholder="Select column or constant" />
                                    </SelectTrigger>
                                    <SelectContent
                                      className="max-h-[600px] min-w-[220px] text-xs"
                                      searchBox={
                                        <input
                                          type="text"
                                          value={search}
                                          onChange={e => setSearch(e.target.value)}
                                          placeholder="Search..."
                                          className="w-full px-2 py-1 border rounded text-xs bg-background"
                                          autoFocus
                                        />
                                      }
                                    >
                                      <SelectItem value="none" className="text-xs">None</SelectItem>
                                      <div className="px-2 py-1 text-xs text-gray-500">Processed Columns</div>
                                      {getFilteredOptions(processedColumns).map((procColumn) => (
                                        <SelectItem key={procColumn} value={procColumn} className="text-xs max-w-[300px] truncate">
                                          {procColumn}
                                        </SelectItem>
                                      ))}
                                      {valueOptions.length > 0 && (
                                        <>
                                          <div className="px-2 py-1 text-xs text-gray-500">Constants from Template Rows 5-500</div>
                                          {getFilteredOptions(valueOptions).map((val) => (
                                            <SelectItem key={val} value={`CONST:${val}`} className="text-xs max-w-[300px] truncate">
                                              {val}
                                            </SelectItem>
                                          ))}
                                        </>
                                      )}
                                    </SelectContent>
                                  </Select>
                                  {/* Custom constant input */}
                                  <div className="mt-2 flex flex-col gap-1">
                                    <input
                                      type="text"
                                      className="border rounded px-2 py-1 text-xs w-full bg-background disabled:bg-gray-100"
                                      placeholder="Type custom constant..."
                                      value={customConstants[column.name] || ""}
                                      onChange={e => handleCustomConstantChange(column.name, e.target.value)}
                                    />
                                    {/* Blue text always rendered, but only visible if set, with min height to prevent layout shift */}
                                    <div className="min-h-[20px]">
                                      {isConstantValue(mappedValue) && (
                                        <span className="text-xs text-blue-700 block">Constant: {getConstantValue(mappedValue)}</span>
                                      )}
                                    </div>
                                  </div>
                                </>
                              )}
                            </TableCell>
                          );
                        })}
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
