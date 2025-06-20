"use client"
import { Button } from "@/components/ui/button"
import { DataPreview } from "./data-preview"
import { Download, RefreshCw, Trash2 } from "lucide-react"
import type { DataRow, PreviewMode } from "./spreadsheet-processor"

interface DataPreviewToggleProps {
  data: DataRow[]
  mode: PreviewMode
  onModeChange: (mode: PreviewMode) => void
  onRefresh: () => void
  onReset: () => void
  onExport: (format: "csv" | "xlsx") => void
  isProcessing: boolean
  showExport: boolean
}

export function DataPreviewToggle({
  data,
  mode,
  onModeChange,
  onRefresh,
  onReset,
  onExport,
  isProcessing,
  showExport,
}: DataPreviewToggleProps) {
  return (
    <div className="grid gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Data Preview</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center border rounded-md overflow-hidden">
            <Button
              variant={mode === "input" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => onModeChange("input")}
            >
              Input
            </Button>
            <Button
              variant={mode === "configured" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => onModeChange("configured")}
            >
              Configured
            </Button>
            <Button
              variant={mode === "processed" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => onModeChange("processed")}
            >
              Processed
            </Button>
            <Button
              variant={mode === "template" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => onModeChange("template")}
            >
              Template
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isProcessing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={onReset}>
              <Trash2 className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </div>

      <DataPreview data={data} mode={mode} />

      {showExport && (
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onExport("csv")}>
            <Download className="h-4 w-4 mr-2" />
            Export as CSV
          </Button>
          <Button onClick={() => onExport("xlsx")}>
            <Download className="h-4 w-4 mr-2" />
            Export as Excel
          </Button>
        </div>
      )}
    </div>
  )
}
