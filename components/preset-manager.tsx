"use client"

import { useState, useEffect } from "react"
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
import { Save, Plus, Trash2, Check, X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { Preset } from "./spreadsheet-processor"

interface PresetManagerProps {
  presets: Preset[]
  activePreset: Preset
  onSavePreset: (preset: Preset) => void
  onLoadPreset: (presetId: string) => void
  onDeletePreset: (presetId: string) => void
}

export function PresetManager({
  presets,
  activePreset,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
}: PresetManagerProps) {
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

  return (
    <Card>
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

          <div className="flex gap-2">
            <Select value={activePreset.id} onValueChange={onLoadPreset}>
              <SelectTrigger className="flex-1">
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
              <Button variant="outline" size="icon" onClick={() => handleDeletePreset(activePreset.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {activePreset.id !== "default" ? (
              <Button variant="outline" className="flex-1" onClick={handleSaveExistingPreset}>
                <Save className="h-4 w-4 mr-2" />
                Update Preset
              </Button>
            ) : (
              <Button variant="outline" className="flex-1" disabled>
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
        </div>
      </CardContent>
    </Card>
  )
}
