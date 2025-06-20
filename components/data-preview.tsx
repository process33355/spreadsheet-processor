"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { DataRow, PreviewMode } from "./spreadsheet-processor"

interface DataPreviewProps {
  data: DataRow[]
  mode: PreviewMode
}

export function DataPreview({ data, mode }: DataPreviewProps) {
  if (!data || data.length === 0) {
    return (
      <div className="border rounded-md p-8 text-center">
        <p className="text-gray-500">No data to preview</p>
      </div>
    )
  }

  const columns = Object.keys(data[0])
  const modeLabels = {
    input: "Raw Input Data",
    configured: "After Configuration",
    processed: "After Processing",
    template: "Template Data",
  }

  return (
    <div className="border rounded-md" style={{ width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
      <div className="bg-muted p-2 text-sm font-medium">{modeLabels[mode]} Preview</div>
      <div style={{ width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
        <div className="h-[400px] overflow-auto" style={{ width: "100%", maxWidth: "100%" }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-20 w-[60px]">#</TableHead>
                {columns.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, rowIndex) => (
                <TableRow key={rowIndex} className={rowIndex % 2 === 0 ? "bg-muted/50" : ""}>
                  <TableCell className="sticky left-0 bg-background z-10">{rowIndex + 1}</TableCell>
                  {columns.map((column) => (
                    <TableCell key={column}>{row[column]}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
