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
  const [customConstantInputs, setCustomConstantInputs] = useState<{ [column: string]: string }>({})

  // Update selected template when templateMapping changes
  useEffect(() => {
    if (templateMapping && templateMapping.templateId) {
      const template = templates.find((t) => t.id === templateMapping.templateId)
      setSelectedTemplate(template || null)
    } else {
      setSelectedTemplate(null)
    }
  }, [templateMapping, templates])

  // Sync customConstants and customConstantInputs with templateMapping changes
  useEffect(() => {
    if (!selectedTemplate) return
    const newCustomConstants: { [column: string]: string } = {}
    const newCustomConstantInputs: { [column: string]: string } = {}
    selectedTemplate.columns.forEach((column) => {
      const mapped = getMappedColumn(column.name)
      if (isConstantValue(mapped)) {
        const val = getConstantValue(mapped)
        newCustomConstants[column.name] = val
        // Only set input if NOT a template constant
        if (!selectedTemplate.valueOptions?.[column.name]?.includes(val)) {
          newCustomConstantInputs[column.name] = val
        } else {
          newCustomConstantInputs[column.name] = ""
        }
      } else {
        newCustomConstants[column.name] = ""
        newCustomConstantInputs[column.name] = ""
      }
    })
    setCustomConstants(newCustomConstants)
    setCustomConstantInputs(newCustomConstantInputs)
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

  // Only update input value, not mapping
  const handleCustomConstantInputChange = (columnName: string, value: string) => {
    setCustomConstantInputs((prev) => ({ ...prev, [columnName]: value }))
  }

  // Set the constant value when clicking 'Set'
  const handleSetCustomConstant = (columnName: string) => {
    const value = customConstantInputs[columnName] || ""
    if (value.trim() !== "") {
      setCustomConstants((prev) => ({ ...prev, [columnName]: value }))
      onColumnMappingChange(columnName, `CONST:${value}`)
    }
  }

  // Remove the constant value when clicking 'Remove'
  const handleRemoveCustomConstant = (columnName: string) => {
    setCustomConstants((prev) => ({ ...prev, [columnName]: "" }))
    setCustomConstantInputs((prev) => ({ ...prev, [columnName]: "" }))
    onColumnMappingChange(columnName, null)
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
              <div className="border rounded-md h-[400px] overflow-y-auto max-h-[333px]">
                {/* Fixed width container with horizontal scrolling */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background z-20 min-w-[160px]">Column Type</TableHead>
                        {selectedTemplate.columns.map((column) => {
                          const mappedValue = getMappedColumn(column.name);
                          const isProcessedColumn = mappedValue && !isConstantValue(mappedValue);
                          const isCustomConstant = !!customConstantInputs[column.name] && customConstantInputs[column.name].trim() !== "";
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
                      <TableRow className="align-top">
                        <TableCell className="font-medium sticky left-0 bg-background z-10 min-w-[160px] align-top pt-4 pb-2 pr-2">
                          <div className="mb-1">Mapping Options</div>
                          <div className="text-xs text-gray-500 font-normal leading-tight space-y-0.5">
                            <div>1. Processed Column</div>
                            <div>2. Template Constant</div>
                            <div>3. Custom Constant</div>
                          </div>
                        </TableCell>
                        {selectedTemplate?.columns?.map((column) => {
                          const mappedValue = getMappedColumn(column.name);
                          const isProcessedColumn = mappedValue && !isConstantValue(mappedValue);
                          const isCustomConstant = !!customConstantInputs[column.name] && customConstantInputs[column.name].trim() !== "";
                          const valueOptions = selectedTemplate?.valueOptions?.[column.name] || [];
                          return (
                            <TableCell key={column.name}>
                              {column.constant !== null ? (
                                <div className="text-sm text-blue-600">Using constant value: {column.constant}</div>
                              ) : (
                                <div className="space-y-3">
                                  {/* Option 1: Processed Column */}
                                  <div>
                                    <Label className="text-xs font-medium text-gray-700">1. Processed Column</Label>
                                    <Select
                                      value={isConstantValue(mappedValue) ? "none" : (mappedValue || "none")}
                                      onValueChange={(value) => handleColumnMappingChange(column.name, value === "none" ? null : value)}
                                      disabled={isConstantValue(mappedValue) || !!isProcessedColumn}
                                    >
                                      <SelectTrigger className="min-w-[180px] max-w-[320px] text-xs mt-1">
                                        <SelectValue placeholder="Select processed column" />
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
                                        {getFilteredOptions(processedColumns).map((procColumn) => (
                                          <SelectItem key={procColumn} value={procColumn} className="text-xs max-w-[300px] truncate">
                                            {procColumn}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Option 2: Template Constant - Always show */}
                                  <div className={!!isProcessedColumn ? "opacity-50 pointer-events-none" : ""}>
                                    <Label className="text-xs font-medium text-gray-700">2. Template Constant</Label>
                                    <Select
                                      value={isConstantValue(mappedValue) && valueOptions.includes(getConstantValue(mappedValue)) && !(customConstantInputs[column.name] && customConstantInputs[column.name].trim() !== "") ? mappedValue || undefined : "none"}
                                      onValueChange={(value) => handleColumnMappingChange(column.name, value === "none" ? null : value)}
                                      disabled={isConstantValue(mappedValue) && (!valueOptions.includes(getConstantValue(mappedValue)) || (customConstantInputs[column.name] && customConstantInputs[column.name].trim() !== "")) || valueOptions.length === 0 || !!isProcessedColumn}
                                    >
                                      <SelectTrigger className="min-w-[180px] max-w-[320px] text-xs mt-1">
                                        <SelectValue placeholder={valueOptions.length === 0 ? "No constants available" : "Select template constant"} />
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
                                        {getFilteredOptions(valueOptions).map((val) => (
                                          <SelectItem key={val} value={`CONST:${val}`} className="text-xs max-w-[300px] truncate">
                                            {val}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Option 3: Custom Constant */}
                                  <div className={!!isProcessedColumn ? "opacity-50 pointer-events-none" : ""}>
                                    <Label className="text-xs font-medium text-gray-700">3. Custom Constant</Label>
                                    <div className="flex gap-2 items-center mt-1">
                                      <input
                                        type="text"
                                        className="border rounded px-2 py-1 text-xs w-full bg-background disabled:bg-gray-100"
                                        placeholder="Type custom constant..."
                                        value={customConstantInputs[column.name] || ""}
                                        onChange={e => handleCustomConstantInputChange(column.name, e.target.value)}
                                        disabled={isConstantValue(mappedValue) || column.constant !== null || !!isProcessedColumn}
                                      />
                                      {/* Set button logic: show if not currently a constant and input is non-empty */}
                                      {!isConstantValue(mappedValue) && !(!!isProcessedColumn) && customConstantInputs[column.name] && customConstantInputs[column.name].trim() !== "" && (
                                        <button
                                          type="button"
                                          className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200"
                                          onClick={() => handleSetCustomConstant(column.name)}
                                        >
                                          Set
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Blue text and Remove button, spaced lower */}
                                  <div className="flex items-center gap-2 mt-4 min-h-[36px]">
                                    {isConstantValue(mappedValue) && !isProcessedColumn ? (
                                      <>
                                        <span className="text-xs text-blue-700 block">
                                          {valueOptions.includes(getConstantValue(mappedValue)) ?
                                            `Template Constant: ${getConstantValue(mappedValue)}` :
                                            `Custom Constant: ${getConstantValue(mappedValue)}`
                                          }
                                        </span>
                                        <button
                                          type="button"
                                          className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 border border-red-200 hover:bg-red-200"
                                          onClick={() => handleRemoveCustomConstant(column.name)}
                                        >
                                          Remove
                                        </button>
                                      </>
                                    ) : isProcessedColumn ? (
                                      <>
                                        <span className="text-xs text-blue-700 block">Processed column: {mappedValue}</span>
                                        <button
                                          type="button"
                                          className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 border border-red-200 hover:bg-red-200"
                                          onClick={() => handleRemoveCustomConstant(column.name)}
                                        >
                                          Remove
                                        </button>
                                      </>
                                    ) : (
                                      // Always reserve space to prevent layout shift
                                      <span className="text-xs block" style={{ visibility: 'hidden' }}>
                                        Template Constant: 
                                      </span>
                                    )}
                                  </div>
                                </div>
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
