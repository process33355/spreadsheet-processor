"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Plus, Trash2, Check, X, Download, Upload } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { Preset } from "./spreadsheet-processor"
import { saveAs } from "file-saver"

interface PresetManagerProps {
  presets: Preset[]
  activePreset: Preset
  onSavePreset: (preset: Preset) => void
  onLoadPreset: (presetId: string) => void
  onDeletePreset: (presetId: string) => void
  onImportPresets: (presets: Preset[]) => void
}

export function PresetManager({
  presets,
  activePreset,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  onImportPresets,
}: PresetManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isNewPresetDialogOpen, setIsNewPresetDialogOpen] = useState(false)
  const [newPresetName, setNewPresetName] = useState("")
  const [notification, setNotification] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  // Clear notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const handleSaveNewPreset = () => {
    if (!newPresetName.trim()) return

    try {
      const newPreset: Preset = {
        ...activePreset,
        id: `preset_${Date.now()}`,
        name: newPresetName,
      }

      onSavePreset(newPreset)
      setNewPresetName("")
      setIsNewPresetDialogOpen(false)
      setNotification({
        type: "success",
        message: `Preset "${newPresetName}" saved successfully!`,
      })
    } catch (error) {
      console.error("Error saving preset:", error)
      setNotification({
        type: "error",
        message: "Failed to save preset. Please try again.",
      })
    }
  }

  const handleSaveExistingPreset = () => {
    try {
      onSavePreset(activePreset)
      setNotification({
        type: "success",
        message: `Preset "${activePreset.name}" updated successfully!`,
      })
    } catch (error) {
      console.error("Error updating preset:", error)
      setNotification({
        type: "error",
        message: "Failed to update preset. Please try again.",
      })
    }
  }

  const handleDeletePreset = (presetId: string) => {
    try {
      const presetToDelete = presets.find((p) => p.id === presetId)
      onDeletePreset(presetId)
      setNotification({
        type: "success",
        message: `Preset "${presetToDelete?.name}" deleted successfully!`,
      })
    } catch (error) {
      console.error("Error deleting preset:", error)
      setNotification({
        type: "error",
        message: "Failed to delete preset. Please try again.",
      })
    }
  }

  const handleExportPresets = () => {
    if (presets.length === 0) {
      setNotification({
        type: "error",
        message: "No presets to export.",
      })
      return
    }

    try {
      const data = JSON.stringify(presets, null, 2)
      const blob = new Blob([data], { type: "application/json" })
      saveAs(blob, "spreadsheet-presets.json")
      setNotification({
        type: "success",
        message: "Presets exported successfully!",
      })
    } catch (error) {
      console.error("Error exporting presets:", error)
      setNotification({
        type: "error",
        message: "Failed to export presets.",
      })
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportPresetsFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const importedPresets = JSON.parse(text)

        if (!Array.isArray(importedPresets) || importedPresets.some((p) => !p.id || !p.name)) {
          setNotification({
            type: "error",
            message: "Invalid preset file format.",
          })
          return
        }

        onImportPresets(importedPresets)
        setNotification({
          type: "success",
          message: "Presets imported successfully!",
        })
      } catch (error) {
        console.error("Error importing presets:", error)
        setNotification({
          type: "error",
          message: "Failed to import presets. File might be corrupt.",
        })
      } finally {
        if (event.target) {
          event.target.value = ""
        }
      }
    }
    reader.readAsText(file)
  }

  return (
    <Card className="bg-blue-50">
      <CardHeader>
        <CardTitle>Presets</CardTitle>
        <CardDescription>Save and load data processing configurations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {notification && (
            <Alert variant={notification.type === "success" ? "default" : "destructive"}>
              <div className="flex items-center gap-2">
                {notification.type === "success" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                <AlertTitle>{notification.type === "success" ? "Success" : "Error"}</AlertTitle>
              </div>
              <AlertDescription>{notification.message}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 items-center">
            <div className="w-fit flex gap-2 items-center">
              <Select value={activePreset.id} onValueChange={onLoadPreset}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select a preset" />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activePreset.id !== "default" && (
                <Button variant="outline" size="icon" className="shrink-0" onClick={() => handleDeletePreset(activePreset.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {activePreset.id !== "default" ? (
              <Button variant="outline" className="w-40" onClick={handleSaveExistingPreset}>
                <Save className="h-4 w-4 mr-2" />
                Update Preset
              </Button>
            ) : (
              <Button variant="outline" className="w-40" disabled>
                <Save className="h-4 w-4 mr-2" />
                Update Preset
              </Button>
            )}

            <Dialog open={isNewPresetDialogOpen} onOpenChange={setIsNewPresetDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Save as New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save New Preset</DialogTitle>
                  <DialogDescription>Give your preset a name to save the current configuration.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="preset-name">Preset Name</Label>
                    <Input
                      id="preset-name"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      placeholder="Enter preset name"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewPresetDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveNewPreset}>Save Preset</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="border-t my-2" />
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportPresets}>
              <Download className="h-4 w-4 mr-2" />
              Export All Presets
            </Button>
            <Button variant="outline" onClick={handleImportClick}>
              <Upload className="h-4 w-4 mr-2" />
              Import Presets
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleImportPresetsFile}
              accept=".json"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
