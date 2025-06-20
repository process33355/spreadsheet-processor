"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, Info, Download } from "lucide-react"
import { saveAs } from "file-saver"
import Papa from "papaparse"
import type { Filter, Transformation, SupportSheet, DataRow } from "./spreadsheet-processor"

interface ProcessingPanelProps {
  allColumns: string[]
  supportSheets: SupportSheet[]
  filters: Filter[]
  transformations: Transformation[]
  configuredData: DataRow[] // Added to show main sheet preview
  onFiltersChange: (filters: Filter[]) => void
  onTransformationsChange: (transformations: Transformation[]) => void
}

export function ProcessingPanel({
  allColumns,
  supportSheets,
  filters,
  transformations,
  configuredData,
  onFiltersChange,
  onTransformationsChange,
}: ProcessingPanelProps) {
  // Get all available columns for a specific support sheet
  const getSupportSheetColumns = (sheetId: string) => {
    const sheet = supportSheets.find((s) => s.id === sheetId)
    return sheet ? sheet.columns : []
  }

  // Get support sheet by ID
  const getSupportSheet = (sheetId: string) => {
    return supportSheets.find((s) => s.id === sheetId)
  }

  // Check if a support sheet exists
  const supportSheetExists = (sheetId: string) => {
    return supportSheets.some((s) => s.id === sheetId)
  }

  // Get available columns for a specific transformation (includes columns from previous transformations)
  const getAvailableColumnsForTransformation = (currentTransformIndex: number) => {
    const baseColumns = [...allColumns]

    // Add columns created by previous transformations
    for (let i = 0; i < currentTransformIndex; i++) {
      const prevTransform = transformations[i]
      if (prevTransform && prevTransform.newColumnName) {
        baseColumns.push(prevTransform.newColumnName)
      }
    }

    return baseColumns
  }

  // Function to get missing lookup values for a specific XLOOKUP transformation
  const getMissingLookupValues = (transform: Transformation, transformIndex: number) => {
    console.log("Checking missing values for transform:", transform.newColumnName)
    console.log("Transform config:", {
      type: transform.type,
      lookupSheet: transform.lookupSheet,
      lookupColumn: transform.lookupColumn,
      sourceColumns: transform.sourceColumns,
    })

    if (
      transform.type !== "xlookup" ||
      !transform.lookupSheet ||
      !transform.lookupColumn ||
      !transform.sourceColumns.length
    ) {
      console.log("Transform not ready for lookup analysis")
      return []
    }

    // Simulate the data processing up to this transformation
    let processedData = configuredData.map((row) => ({ ...row }))
    console.log("Starting with configured data rows:", processedData.length)

    // Apply previous transformations
    for (let i = 0; i < transformIndex; i++) {
      const prevTransform = transformations[i]
      processedData = processedData.map((row) => {
        const newRow = { ...row }

        switch (prevTransform.type) {
          case "multiply":
            if (prevTransform.sourceColumns.length === 2) {
              newRow[prevTransform.newColumnName] =
                Number(newRow[prevTransform.sourceColumns[0]]) * Number(newRow[prevTransform.sourceColumns[1]])
            }
            break
          case "add":
            if (prevTransform.sourceColumns.length === 2) {
              newRow[prevTransform.newColumnName] =
                Number(newRow[prevTransform.sourceColumns[0]]) + Number(newRow[prevTransform.sourceColumns[1]])
            }
            break
          case "subtract":
            if (prevTransform.sourceColumns.length === 2) {
              newRow[prevTransform.newColumnName] =
                Number(newRow[prevTransform.sourceColumns[0]]) - Number(newRow[prevTransform.sourceColumns[1]])
            }
            break
          case "divide":
            if (prevTransform.sourceColumns.length === 2) {
              newRow[prevTransform.newColumnName] =
                Number(newRow[prevTransform.sourceColumns[0]]) / Number(newRow[prevTransform.sourceColumns[1]])
            }
            break
          case "concat":
            newRow[prevTransform.newColumnName] = prevTransform.sourceColumns.map((col) => newRow[col]).join("")
            break
          case "custom":
            if (prevTransform.formula) {
              try {
                const evalContext: Record<string, any> = {}
                Object.keys(newRow).forEach((key) => {
                  const safeKey = key.replace(/[^a-zA-Z0-9_]/g, "_")
                  evalContext[safeKey] = Number(newRow[key]) || newRow[key]
                })

                let safeFormula = prevTransform.formula
                Object.keys(newRow).forEach((key) => {
                  const safeKey = key.replace(/[^a-zA-Z0-9_]/g, "_")
                  safeFormula = safeFormula.replace(new RegExp(`\\b${key}\\b`, "g"), safeKey)
                })

                const result = new Function(...Object.keys(evalContext), `return ${safeFormula}`)(
                  ...Object.values(evalContext),
                )
                newRow[prevTransform.newColumnName] = result
              } catch (e) {
                newRow[prevTransform.newColumnName] = "Error"
              }
            }
            break
        }

        return newRow
      })
    }

    console.log("After applying previous transforms, data rows:", processedData.length)

    // Now check which lookup values are missing
    const missingValues: Array<{ lookupValue: string; sourceRow: DataRow }> = []
    const lookupColumn = transform.sourceColumns[0]

    console.log("Looking up values from column:", lookupColumn)

    // Get all unique lookup values first - but exclude empty/null/undefined values
    const allLookupValues = new Set<string>()
    processedData.forEach((row) => {
      const lookupValue = row[lookupColumn]
      // Only include meaningful values (not empty, null, undefined, or "Error")
      if (
        lookupValue !== undefined &&
        lookupValue !== null &&
        lookupValue !== "" &&
        String(lookupValue).trim() !== "" &&
        String(lookupValue) !== "Error" &&
        String(lookupValue) !== "undefined" &&
        String(lookupValue) !== "null"
      ) {
        allLookupValues.add(String(lookupValue).trim())
      }
    })

    console.log("Total unique lookup values to check:", allLookupValues.size)
    console.log("Sample lookup values:", Array.from(allLookupValues).slice(0, 5))

    // Check each unique lookup value
    allLookupValues.forEach((lookupValue) => {
      let found = false

      if (transform.lookupSheet === "main") {
        // Look up in the main dataset
        found = processedData.some((r) => {
          const compareValue = r[transform.lookupColumn!]
          return (
            compareValue === lookupValue ||
            String(compareValue).trim() === String(lookupValue).trim() ||
            String(compareValue).toLowerCase().trim() === String(lookupValue).toLowerCase().trim()
          )
        })
      } else {
        // Look up in a support sheet
        const supportSheet = supportSheets.find((s) => s.id === transform.lookupSheet)
        if (supportSheet) {
          console.log("Looking in support sheet:", supportSheet.name, "with", supportSheet.data.length, "rows")
          found = supportSheet.data.some((r) => {
            const compareValue = r[transform.lookupColumn!]
            return (
              compareValue === lookupValue ||
              String(compareValue).trim() === String(lookupValue).trim() ||
              String(compareValue).toLowerCase().trim() === String(lookupValue).toLowerCase().trim()
            )
          })
        } else {
          console.log("Support sheet not found for ID:", transform.lookupSheet)
        }
      }

      if (!found) {
        // Find a source row with this lookup value for context
        const sourceRow = processedData.find((row) => String(row[lookupColumn]) === lookupValue)
        if (sourceRow) {
          missingValues.push({ lookupValue, sourceRow })
        }
      }
    })

    console.log("Missing values found:", missingValues.length)
    console.log(
      "Sample missing values:",
      missingValues.slice(0, 3).map((v) => v.lookupValue),
    )

    return missingValues
  }

  // Function to download missing lookup values as CSV
  const downloadMissingValues = (transform: Transformation, transformIndex: number) => {
    const missingValues = getMissingLookupValues(transform, transformIndex)

    if (missingValues.length === 0) {
      alert("No missing lookup values found!")
      return
    }

    // Create CSV data
    const csvData = missingValues.map((item, index) => ({
      Row: index + 1,
      "Missing Lookup Value": item.lookupValue,
      "Source File": item.sourceRow["Source File"] || "",
      // Add other relevant columns from the source row
      ...Object.keys(item.sourceRow)
        .filter((key) => key !== "Source File")
        .reduce(
          (obj, key) => {
            obj[key] = item.sourceRow[key]
            return obj
          },
          {} as Record<string, any>,
        ),
    }))

    // Generate CSV
    const csv = Papa.unparse(csvData)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const fileName = `missing_lookup_values_${transform.newColumnName}_${new Date().toISOString().slice(0, 10)}.csv`
    saveAs(blob, fileName)
  }

  const addFilter = () => {
    try {
      const newFilter: Filter = {
        id: `filter_${Date.now()}`,
        column: allColumns.length > 0 ? allColumns[0] : "",
        operator: "equals",
        value: "",
      }
      onFiltersChange([...filters, newFilter])
    } catch (error) {
      console.error("Error adding filter:", error)
    }
  }

  const updateFilter = (id: string, updates: Partial<Filter>) => {
    try {
      onFiltersChange(filters.map((filter) => (filter.id === id ? { ...filter, ...updates } : filter)))
    } catch (error) {
      console.error("Error updating filter:", error)
    }
  }

  const removeFilter = (id: string) => {
    try {
      onFiltersChange(filters.filter((filter) => filter.id !== id))
    } catch (error) {
      console.error("Error removing filter:", error)
    }
  }

  const addTransformation = () => {
    try {
      // Create a safe new transformation with default values
      const newTransformation: Transformation = {
        id: `transform_${Date.now()}`,
        type: "multiply",
        newColumnName: "New Column",
        sourceColumns: [],
      }

      // Only add source columns if we have columns available
      if (allColumns.length >= 1) {
        newTransformation.sourceColumns = [allColumns[0]]
        if (allColumns.length >= 2) {
          newTransformation.sourceColumns.push(allColumns[1])
        }
      }

      // Add the new transformation to the existing ones
      const updatedTransformations = [...transformations, newTransformation]
      onTransformationsChange(updatedTransformations)
    } catch (error) {
      console.error("Error adding transformation:", error)
    }
  }

  const updateTransformation = (id: string, updates: Partial<Transformation>) => {
    try {
      const updatedTransformations = transformations.map((transform) => {
        if (transform.id === id) {
          // Create a safe merged object
          const updated = { ...transform, ...updates }

          // Ensure sourceColumns is always an array
          if (!Array.isArray(updated.sourceColumns)) {
            updated.sourceColumns = []
          }

          return updated
        }
        return transform
      })

      onTransformationsChange(updatedTransformations)
    } catch (error) {
      console.error("Error updating transformation:", error)
    }
  }

  const removeTransformation = (id: string) => {
    try {
      onTransformationsChange(transformations.filter((transform) => transform.id !== id))
    } catch (error) {
      console.error("Error removing transformation:", error)
    }
  }

  // Handle XLOOKUP sheet selection
  const handleXLookupSheetChange = (transformId: string, sheetId: string) => {
    try {
      updateTransformation(transformId, {
        lookupSheet: sheetId,
        lookupColumn: "",
        returnColumn: "",
      })
    } catch (error) {
      console.error("Error handling XLOOKUP sheet change:", error)
    }
  }

  // Handle XLOOKUP column selection
  const handleXLookupColumnChange = (transformId: string, columnType: "lookup" | "return", columnName: string) => {
    try {
      if (columnType === "lookup") {
        updateTransformation(transformId, { lookupColumn: columnName })
      } else {
        updateTransformation(transformId, { returnColumn: columnName })
      }
    } catch (error) {
      console.error("Error handling XLOOKUP column change:", error)
    }
  }

  // Safe access to sourceColumns
  const getSourceColumns = (transform: Transformation) => {
    return Array.isArray(transform.sourceColumns) ? transform.sourceColumns : []
  }

  // Safe update of sourceColumns
  const updateSourceColumn = (transform: Transformation, index: number, value: string) => {
    const sourceColumns = [...getSourceColumns(transform)]
    sourceColumns[index] = value
    return sourceColumns
  }

  return (
    <Card className="bg-blue-50">
      <CardContent className="pt-6">
        <div className="grid gap-6">
          <Accordion type="single" collapsible defaultValue="filters">
            <AccordionItem value="filters">
              <AccordionTrigger className="flex justify-between">
                <div className="flex items-center">
                  Filters <span className="ml-2 text-sm text-muted-foreground">({filters.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4">
                  {filters.map((filter) => (
                    <div key={filter.id} className="grid gap-4 p-4 border rounded-md bg-white">
                      <div className="flex justify-between items-start">
                        <Label>Filter</Label>
                        <Button variant="ghost" size="icon" onClick={() => removeFilter(filter.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="grid gap-2">
                          <Label htmlFor={`filter-column-${filter.id}`}>Column</Label>
                          <Select
                            value={filter.column}
                            onValueChange={(value) => updateFilter(filter.id, { column: value })}
                          >
                            <SelectTrigger id={`filter-column-${filter.id}`}>
                              <SelectValue placeholder="Select column" />
                            </SelectTrigger>
                            <SelectContent>
                              {allColumns.map((column) => (
                                <SelectItem key={column} value={column}>
                                  {column}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor={`filter-operator-${filter.id}`}>Operator</Label>
                          <Select
                            value={filter.operator}
                            onValueChange={(value: any) => updateFilter(filter.id, { operator: value })}
                          >
                            <SelectTrigger id={`filter-operator-${filter.id}`}>
                              <SelectValue placeholder="Select operator" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="equals">Equals</SelectItem>
                              <SelectItem value="contains">Contains</SelectItem>
                              <SelectItem value="greaterThan">Greater Than</SelectItem>
                              <SelectItem value="lessThan">Less Than</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor={`filter-value-${filter.id}`}>Value</Label>
                          <Input
                            id={`filter-value-${filter.id}`}
                            value={filter.value}
                            onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                            placeholder="Enter value"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button variant="outline" onClick={addFilter}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Filter
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="transformations">
              <AccordionTrigger className="flex justify-between">
                <div className="flex items-center">
                  Transformations <span className="ml-2 text-sm text-muted-foreground">({transformations.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4">
                  {transformations.map((transform, transformIndex) => {
                    const availableColumns = getAvailableColumnsForTransformation(transformIndex)
                    const missingValues =
                      transform.type === "xlookup" ? getMissingLookupValues(transform, transformIndex) : []

                    return (
                      <div key={transform.id} className="grid gap-4 p-4 border rounded-md bg-white">
                        <div className="flex justify-between items-start">
                          <Label>Transformation</Label>
                          <div className="flex gap-2">
                            {transform.type === "xlookup" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadMissingValues(transform, transformIndex)}
                                title={
                                  missingValues.length === 0
                                    ? "No missing values found"
                                    : `Download ${missingValues.length} missing values`
                                }
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Missing ({missingValues.length})
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => removeTransformation(transform.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor={`transform-type-${transform.id}`}>Type</Label>
                            <Select
                              value={transform.type}
                              onValueChange={(value: any) => updateTransformation(transform.id, { type: value })}
                            >
                              <SelectTrigger id={`transform-type-${transform.id}`}>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="multiply">Multiply</SelectItem>
                                <SelectItem value="add">Add</SelectItem>
                                <SelectItem value="subtract">Subtract</SelectItem>
                                <SelectItem value="divide">Divide</SelectItem>
                                <SelectItem value="concat">Concatenate</SelectItem>
                                <SelectItem value="xlookup">XLOOKUP</SelectItem>
                                <SelectItem value="custom">Custom Formula</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor={`transform-name-${transform.id}`}>New Column Name</Label>
                            <Input
                              id={`transform-name-${transform.id}`}
                              value={transform.newColumnName}
                              onChange={(e) => updateTransformation(transform.id, { newColumnName: e.target.value })}
                              placeholder="Enter new column name"
                            />
                          </div>

                          {transform.type === "xlookup" ? (
                            <div className="grid gap-4 lg:grid-cols-2">
                              <div className="grid gap-4">
                                <div className="grid gap-2">
                                  <Label>Lookup Value (From Column)</Label>
                                  <Select
                                    value={getSourceColumns(transform)[0] || ""}
                                    onValueChange={(value) => {
                                      updateTransformation(transform.id, {
                                        sourceColumns: updateSourceColumn(transform, 0, value),
                                      })
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableColumns.map((column) => (
                                        <SelectItem key={column} value={column}>
                                          {column}
                                          {!allColumns.includes(column) && (
                                            <span className="ml-1 text-xs text-blue-600">(from transformation)</span>
                                          )}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="grid gap-2">
                                  <Label>Lookup In Sheet</Label>
                                  <Select
                                    value={transform.lookupSheet || ""}
                                    onValueChange={(value) => handleXLookupSheetChange(transform.id, value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select sheet" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="main">Main Sheet</SelectItem>
                                      {supportSheets.map((sheet) => (
                                        <SelectItem key={sheet.id} value={sheet.id}>
                                          {sheet.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  {transform.lookupSheet &&
                                    transform.lookupSheet !== "main" &&
                                    !supportSheetExists(transform.lookupSheet) && (
                                      <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded-md mt-1">
                                        <Info className="h-4 w-4" />
                                        <span>
                                          Support sheet not found: {transform.lookupSheetName || transform.lookupSheet}
                                          {transform.lookupSheetLastEdited &&
                                            ` (Last edited: ${transform.lookupSheetLastEdited})`}
                                        </span>
                                      </div>
                                    )}
                                </div>

                                {transform.lookupSheet && (
                                  <>
                                    <div className="grid gap-2">
                                      <Label>Lookup Column</Label>
                                      <Select
                                        value={transform.lookupColumn || ""}
                                        onValueChange={(value) =>
                                          handleXLookupColumnChange(transform.id, "lookup", value)
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select column" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {transform.lookupSheet === "main"
                                            ? availableColumns.map((column) => (
                                                <SelectItem key={column} value={column}>
                                                  {column}
                                                  {!allColumns.includes(column) && (
                                                    <span className="ml-1 text-xs text-blue-600">
                                                      (from transformation)
                                                    </span>
                                                  )}
                                                </SelectItem>
                                              ))
                                            : getSupportSheetColumns(transform.lookupSheet).map((column) => (
                                                <SelectItem key={column} value={column}>
                                                  {column}
                                                </SelectItem>
                                              ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="grid gap-2">
                                      <Label>Return Column</Label>
                                      <Select
                                        value={transform.returnColumn || ""}
                                        onValueChange={(value) =>
                                          handleXLookupColumnChange(transform.id, "return", value)
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select column" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {transform.lookupSheet === "main"
                                            ? availableColumns.map((column) => (
                                                <SelectItem key={column} value={column}>
                                                  {column}
                                                  {!allColumns.includes(column) && (
                                                    <span className="ml-1 text-xs text-blue-600">
                                                      (from transformation)
                                                    </span>
                                                  )}
                                                </SelectItem>
                                              ))
                                            : getSupportSheetColumns(transform.lookupSheet).map((column) => (
                                                <SelectItem key={column} value={column}>
                                                  {column}
                                                </SelectItem>
                                              ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* XLOOKUP Preview Panel */}
                              {transform.lookupSheet &&
                                transform.lookupSheet !== "main" &&
                                supportSheetExists(transform.lookupSheet) && (
                                  <div className="border rounded-md overflow-hidden">
                                    <div className="bg-muted p-2 text-sm font-medium">
                                      Preview: {getSupportSheet(transform.lookupSheet)?.name}
                                    </div>
                                    <div style={{ width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
                                      <div
                                        className="h-[250px] overflow-auto"
                                        style={{ width: "100%", maxWidth: "100%" }}
                                      >
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              {getSupportSheetColumns(transform.lookupSheet).map((column) => (
                                                <TableHead
                                                  key={column}
                                                  className={`
                                                  ${column === transform.lookupColumn ? "bg-blue-300 font-bold" : ""} 
                                                  ${column === transform.returnColumn ? "bg-green-300 font-bold" : ""}
                                                `}
                                                >
                                                  {column}
                                                  {column === transform.lookupColumn && (
                                                    <span className="ml-1 text-xs text-blue-700">(lookup)</span>
                                                  )}
                                                  {column === transform.returnColumn && (
                                                    <span className="ml-1 text-xs text-green-700">(return)</span>
                                                  )}
                                                </TableHead>
                                              ))}
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {getSupportSheet(transform.lookupSheet)
                                              ?.data.slice(0, 10)
                                              .map((row, rowIndex) => (
                                                <TableRow key={rowIndex}>
                                                  {getSupportSheetColumns(transform.lookupSheet).map((column) => (
                                                    <TableCell
                                                      key={column}
                                                      className={`
                                                    ${column === transform.lookupColumn ? "bg-blue-200" : ""} 
                                                    ${column === transform.returnColumn ? "bg-green-200" : ""}
                                                  `}
                                                    >
                                                      {row[column]}
                                                    </TableCell>
                                                  ))}
                                                </TableRow>
                                              ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </div>
                                  </div>
                                )}

                              {transform.lookupSheet === "main" && (
                                <div className="border rounded-md overflow-hidden">
                                  <div className="bg-muted p-2 text-sm font-medium">Preview: Main Sheet</div>
                                  <div style={{ width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
                                    <div
                                      className="h-[250px] overflow-auto"
                                      style={{ width: "100%", maxWidth: "100%" }}
                                    >
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            {availableColumns.map((column) => (
                                              <TableHead
                                                key={column}
                                                className={`
                                                  ${column === transform.lookupColumn ? "bg-blue-300 font-bold" : ""} 
                                                  ${column === transform.returnColumn ? "bg-green-300 font-bold" : ""}
                                                `}
                                              >
                                                {column}
                                                {column === transform.lookupColumn && (
                                                  <span className="ml-1 text-xs text-blue-700">(lookup)</span>
                                                )}
                                                {column === transform.returnColumn && (
                                                  <span className="ml-1 text-xs text-green-700">(return)</span>
                                                )}
                                              </TableHead>
                                            ))}
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {configuredData.slice(0, 10).map((row, rowIndex) => (
                                            <TableRow key={rowIndex}>
                                              {availableColumns.map((column) => (
                                                <TableCell
                                                  key={column}
                                                  className={`
                                                    ${column === transform.lookupColumn ? "bg-blue-200" : ""} 
                                                    ${column === transform.returnColumn ? "bg-green-200" : ""}
                                                  `}
                                                >
                                                  {row[column]}
                                                </TableCell>
                                              ))}
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : transform.type !== "custom" ? (
                            <div className="grid gap-2">
                              <Label>Source Columns</Label>
                              <div className="grid gap-2">
                                {transform.type === "concat" ? (
                                  <div className="grid gap-2">
                                    {getSourceColumns(transform).map((column, index) => (
                                      <div key={index} className="flex gap-2">
                                        <Select
                                          value={column}
                                          onValueChange={(value) => {
                                            updateTransformation(transform.id, {
                                              sourceColumns: updateSourceColumn(transform, index, value),
                                            })
                                          }}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select column" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {availableColumns.map((col) => (
                                              <SelectItem key={col} value={col}>
                                                {col}
                                                {!allColumns.includes(col) && (
                                                  <span className="ml-1 text-xs text-blue-600">
                                                    (from transformation)
                                                  </span>
                                                )}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>

                                        <Button
                                          variant="outline"
                                          size="icon"
                                          onClick={() => {
                                            const newColumns = getSourceColumns(transform).filter((_, i) => i !== index)
                                            updateTransformation(transform.id, { sourceColumns: newColumns })
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))}

                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        const currentColumns = getSourceColumns(transform)
                                        const defaultColumn = availableColumns.length > 0 ? availableColumns[0] : ""
                                        updateTransformation(transform.id, {
                                          sourceColumns: [...currentColumns, defaultColumn],
                                        })
                                      }}
                                    >
                                      <Plus className="h-4 w-4 mr-2" />
                                      Add Column
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    <div>
                                      <Label>First Column</Label>
                                      <Select
                                        value={getSourceColumns(transform)[0] || ""}
                                        onValueChange={(value) => {
                                          updateTransformation(transform.id, {
                                            sourceColumns: updateSourceColumn(transform, 0, value),
                                          })
                                        }}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select column" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {availableColumns.map((column) => (
                                            <SelectItem key={column} value={column}>
                                              {column}
                                              {!allColumns.includes(column) && (
                                                <span className="ml-1 text-xs text-blue-600">
                                                  (from transformation)
                                                </span>
                                              )}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div>
                                      <Label>Second Column</Label>
                                      <Select
                                        value={getSourceColumns(transform)[1] || ""}
                                        onValueChange={(value) => {
                                          updateTransformation(transform.id, {
                                            sourceColumns: updateSourceColumn(transform, 1, value),
                                          })
                                        }}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select column" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {availableColumns.map((column) => (
                                            <SelectItem key={column} value={column}>
                                              {column}
                                              {!allColumns.includes(column) && (
                                                <span className="ml-1 text-xs text-blue-600">
                                                  (from transformation)
                                                </span>
                                              )}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="grid gap-2">
                              <Label htmlFor={`transform-formula-${transform.id}`}>Custom Formula</Label>
                              <Textarea
                                id={`transform-formula-${transform.id}`}
                                value={transform.formula || ""}
                                onChange={(e) => updateTransformation(transform.id, { formula: e.target.value })}
                                placeholder="Enter formula (e.g., Column1 * 2 + Column2)"
                                className="min-h-[100px]"
                              />
                              <p className="text-sm text-gray-500">
                                Use column names directly in your formula. Example: Price * Quantity
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  <Button variant="outline" onClick={addTransformation}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Transformation
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </CardContent>
    </Card>
  )
}
