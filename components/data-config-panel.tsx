"use client"

import type React from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface DataConfigPanelProps {
  rawData: string[][]
  allColumns: string[]
  headerRow: number
  selectedColumns: string[]
  onHeaderRowChange: (row: number) => void
  onSelectedColumnsChange: (columns: string[]) => void
}

export function DataConfigPanel({
  rawData,
  allColumns,
  headerRow,
  selectedColumns,
  onHeaderRowChange,
  onSelectedColumnsChange,
}: DataConfigPanelProps) {
  const handleHeaderRowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value)
    if (!isNaN(value) && value >= 0 && value < rawData.length) {
      onHeaderRowChange(value)
    }
  }

  const toggleColumnSelection = (column: string) => {
    if (selectedColumns.includes(column)) {
      onSelectedColumnsChange(selectedColumns.filter((col) => col !== column))
    } else {
      onSelectedColumnsChange([...selectedColumns, column])
    }
  }

  const toggleAllColumns = () => {
    if (selectedColumns.length === allColumns.length) {
      onSelectedColumnsChange([])
    } else {
      onSelectedColumnsChange([...allColumns])
    }
  }

  return (
    <Card className="bg-blue-50">
      <CardContent className="pt-6">
        <div className="grid gap-6">
          {/* Header Row Selection - Moved to the top */}
          <div className="grid gap-2">
            <Label htmlFor="header-row">Header Row (0-based index)</Label>
            <Input
              id="header-row"
              type="number"
              min={0}
              max={rawData.length - 1}
              value={headerRow}
              onChange={handleHeaderRowChange}
              className="w-full max-w-xs"
            />
          </div>

          {/* Data Preview */}
          <div className="grid gap-2">
            <Label>Input Data Preview</Label>
            <div className="border rounded-md" style={{ width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
              <div className="h-[300px] overflow-auto" style={{ width: "100%", maxWidth: "100%" }}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-20 w-[60px]">#</TableHead>
                      {rawData[headerRow]?.map((header, index) => (
                        <TableHead key={index}>{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rawData.slice(headerRow + 1, headerRow + 11).map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        <TableCell className="sticky left-0 bg-background z-10">{rowIndex + headerRow + 1}</TableCell>
                        {row.map((cell, cellIndex) => (
                          <TableCell key={cellIndex}>{cell}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* Column Selection */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Select Columns</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectedColumns.length === allColumns.length}
                  onCheckedChange={toggleAllColumns}
                />
                <label
                  htmlFor="select-all"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Select All
                </label>
              </div>
            </div>

            <div className="border rounded-md h-[300px] overflow-y-auto">
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {allColumns.map((column) => (
                  <div key={column} className="flex items-center space-x-2">
                    <Checkbox
                      id={`column-${column}`}
                      checked={selectedColumns.includes(column)}
                      onCheckedChange={() => toggleColumnSelection(column)}
                    />
                    <label
                      htmlFor={`column-${column}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 truncate"
                    >
                      {column}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
