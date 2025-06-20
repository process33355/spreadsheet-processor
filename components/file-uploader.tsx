"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, FileText, X, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface FileUploaderProps {
  onFilesUpload: (files: File[]) => void
  currentFiles: File[]
  maxFiles?: number
  maxTotalSize?: number // in MB
}

export function FileUploader({ onFilesUpload, currentFiles, maxFiles = 12, maxTotalSize = 20 }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files))
    }
  }

  const handleFiles = (newFiles: File[]) => {
    setError(null)

    // Check file extensions
    const validExtensions = [".csv", ".xlsx", ".xls", ".txt"]
    const invalidFiles = newFiles.filter((file) => {
      const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase()
      return !validExtensions.includes(fileExtension)
    })

    if (invalidFiles.length > 0) {
      setError(`Some files have invalid formats. Please upload only CSV, Excel, or TXT files.`)
      return
    }

    // Check max files limit
    const totalFiles = [...currentFiles, ...newFiles]
    if (totalFiles.length > maxFiles) {
      setError(`You can upload a maximum of ${maxFiles} files.`)
      return
    }

    // Check total size
    const totalSizeMB = totalFiles.reduce((sum, file) => sum + file.size / (1024 * 1024), 0)
    if (totalSizeMB > maxTotalSize) {
      setError(`Total file size exceeds the ${maxTotalSize}MB limit.`)
      return
    }

    onFilesUpload([...currentFiles, ...newFiles])
  }

  const removeFile = (index: number) => {
    const updatedFiles = [...currentFiles]
    updatedFiles.splice(index, 1)
    onFilesUpload(updatedFiles)
  }

  const getTotalSize = () => {
    return (currentFiles.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024)).toFixed(2)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Spreadsheets</CardTitle>
        <CardDescription>
          Upload up to {maxFiles} CSV, Excel, or TXT files (max {maxTotalSize}MB total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors mb-4 ${
            isDragging ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-10 w-10 mx-auto mb-4 text-gray-400" />
          <p className="text-sm text-gray-600 mb-2">Drag and drop your files here, or click to browse</p>
          <p className="text-xs text-gray-500">Supported formats: CSV, Excel, TXT</p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInput}
            accept=".csv,.xlsx,.xls,.txt"
            className="hidden"
            multiple
          />
        </div>

        {currentFiles.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">
                Uploaded Files ({currentFiles.length}/{maxFiles})
              </h3>
              <p className="text-xs text-gray-500">
                Total Size: {getTotalSize()} MB / {maxTotalSize} MB
              </p>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {currentFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  <FileText className="h-6 w-6 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile(index)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => fileInputRef.current?.click()}>
                Add More Files
              </Button>
              <Button
                variant="outline"
                className="flex-shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => onFilesUpload([])}
              >
                Remove All
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
