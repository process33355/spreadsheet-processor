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
  selectedColumns: number[]
  onHeaderRowChange: (row: number) => void
  onSelectedColumnsChange: (columns: number[]) => void
  usePlaceholderHeader: boolean
  onUsePlaceholderHeaderChange: (value: boolean) => void
  previewHeaders: string[]
  previewRows: string[][]
  placeholderHeaders: string[]
  setPlaceholderHeaders: (headers: string[]) => void
}

export function DataConfigPanel({
  rawData,
  allColumns,
  headerRow,
  selectedColumns,
  onHeaderRowChange,
  onSelectedColumnsChange,
  usePlaceholderHeader,
  onUsePlaceholderHeaderChange,
  previewHeaders,
  previewRows,
  placeholderHeaders,
  setPlaceholderHeaders,
}: DataConfigPanelProps) {
  const handleHeaderRowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value)
    if (!isNaN(value) && value >= 0 && value < rawData.length) {
      onHeaderRowChange(value)
    }
  }

  const toggleColumnSelection = (colIdx: number) => {
    if (selectedColumns.includes(colIdx)) {
      onSelectedColumnsChange(selectedColumns.filter((idx) => idx !== colIdx))
    } else {
      onSelectedColumnsChange([...selectedColumns, colIdx])
    }
  }

  const toggleAllColumns = () => {
    if (selectedColumns.length === allColumns.length) {
      onSelectedColumnsChange([])
    } else {
      onSelectedColumnsChange(allColumns.map((_, idx) => idx))
    }
  }

  return (
    <Card className="bg-blue-50">
      <CardContent className="pt-6">
        <div className="grid gap-6">
          {/* Placeholder Header Option */}
          <div className="flex flex-col gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="placeholder-header"
                checked={usePlaceholderHeader}
                onCheckedChange={onUsePlaceholderHeaderChange}
              />
              <label htmlFor="placeholder-header" className="text-sm font-medium leading-none">
                Use placeholder header (Column 1, Column 2, ...)
              </label>
            </div>
            {usePlaceholderHeader && (
              <div className="mt-2">
                {/* Editable placeholder column names */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {placeholderHeaders.map((header, idx) => {
                    const defaultName = `Column ${idx + 1}`
                    const isCustom = header !== defaultName
                    return (
                      <input
                        key={idx}
                        type="text"
                        value={header}
                        onChange={e => {
                          const newHeaders = [...placeholderHeaders]
                          newHeaders[idx] = e.target.value
                          setPlaceholderHeaders(newHeaders)
                        }}
                        className={`rounded px-2 py-1 text-xs w-28 border ${isCustom ? 'border-blue-500' : 'border-gray-300'}`}
                      />
                    )
                  })}
                </div>
                {/* First 3 rows preview */}
                <div className="overflow-x-auto border rounded bg-white">
                  <table className="text-xs w-full">
                    <thead>
                      <tr>
                        {placeholderHeaders.map((header, idx) => {
                          const defaultName = `Column ${idx + 1}`
                          const isCustom = header !== defaultName
                          return (
                            <th
                              key={idx}
                              className={`px-2 py-1 border-b text-left ${isCustom ? 'border border-blue-500 text-blue-700 rounded' : ''}`}
                            >
                              {header}
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {rawData.slice(0, 3).map((row, rowIdx) => (
                        <tr key={rowIdx}>
                          {placeholderHeaders.map((_, colIdx) => (
                            <td key={colIdx} className="px-2 py-1 border-b">{row[colIdx]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          {/* Header Row Selection - Moved to the top */}
          <div className="grid gap-2 w-[200px]">
            <Label htmlFor="header-row">Header Row (0-based index)</Label>
            <Input
              id="header-row"
              type="number"
              min={0}
              max={rawData.length - 1}
              value={headerRow}
              onChange={handleHeaderRowChange}
              className="w-full max-w-xs"
              disabled={usePlaceholderHeader}
            />
          </div>

          {/* Data Preview */}
          <div className="grid gap-2">
            <Label>Input Data Preview</Label>
            <div className="border rounded-md bg-white" style={{ width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
              <div className="h-[300px] overflow-auto" style={{ width: "100%", maxWidth: "100%" }}>
                <Table className="bg-white text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-white z-20 w-[60px] px-2 py-1 text-xs">#</TableHead>
                      {previewHeaders.map((header, index) => {
                        const isSelected = selectedColumns.includes(index)
                        return (
                          <TableHead
                            key={index}
                            className={`px-2 py-1 text-xs ${isSelected ? 'bg-blue-100' : ''}`}
                          >
                            {header}
                          </TableHead>
                        )
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.slice(0, 10).map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        <TableCell className="sticky left-0 bg-white z-10 px-2 py-1 text-xs">{rowIndex + 1}</TableCell>
                        {previewHeaders.map((header, cellIndex) => {
                          const isSelected = selectedColumns.includes(cellIndex)
                          return (
                            <TableCell
                              key={cellIndex}
                              className={`px-2 py-1 text-xs ${isSelected ? 'bg-blue-100' : ''}`}
                            >
                              {row[cellIndex]}
                            </TableCell>
                          )
                        })}
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
                {allColumns.map((column, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <Checkbox
                      id={`column-${idx}`}
                      checked={selectedColumns.includes(idx)}
                      onCheckedChange={() => toggleColumnSelection(idx)}
                    />
                    <label
                      htmlFor={`column-${idx}`}
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
