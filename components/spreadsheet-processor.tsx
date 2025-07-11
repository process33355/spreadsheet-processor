"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { FileUploader } from "./file-uploader"
import { PresetManager } from "./preset-manager"
import { DataConfigPanel } from "./data-config-panel"
import { ProcessingPanel } from "./processing-panel"
import { SupportSheetsManager } from "./support-sheets-manager"
import { TemplatesManager } from "./templates-manager"
import { TemplateFillingPanel } from "./template-filling-panel"
import { saveAs } from "file-saver"
import * as XLSX from "xlsx"
import Papa from "papaparse"
import { DataPreviewToggle } from "./data-preview-toggle"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, Info } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export type Preset = {
  id: string
  name: string
  headerRow: number
  selectedColumns: number[]
  filters: Filter[]
  transformations: Transformation[]
  includeSourceFileColumn: boolean
  templateMapping: TemplateMapping | null
}

export type Filter = {
  id: string
  column: string
  operator: "equals" | "contains" | "greaterThan" | "lessThan"
  value: string
  caseSensitive?: boolean
}

export type Transformation = {
  id: string
  type: "multiply" | "add" | "subtract" | "divide" | "concat" | "custom" | "xlookup" | "text"
  newColumnName: string
  sourceColumns: string[] // This should always be initialized as an array
  formula?: string
  lookupSheet?: string // For XLOOKUP: "main" or support sheet id
  lookupColumn?: string // For XLOOKUP: column to look up values in
  returnColumn?: string // For XLOOKUP: column to return values from
  lookupSheetName?: string // For tracking missing support sheets
  lookupSheetLastEdited?: string // For tracking missing support sheets
  textValue?: string // For text transformation
  textParts?: string[] // For concatenate transformation, to hold text parts
}

export type DataRow = Record<string, any>

export type SupportSheet = {
  id: string
  name: string
  file: File | null
  data: DataRow[]
  columns: string[]
  uniqueId?: string // Format: filename__ext__YYYYMMDD_HHMMSS__XXXX
  originalFileName?: string
  uploadDateTime?: string
  lastEditedDateTime?: string
}

export type TemplateColumn = {
  name: string
  constant: string | null
}

export type Template = {
  id: string
  name: string
  file: File | null
  columns: TemplateColumn[]
  valueOptions?: Record<string, string[]>
  uploadDateTime?: string
  lastEditedDateTime?: string
}

export type TemplateMapping = {
  templateId: string
  columnMappings: Record<string, string | null>
}

export type InputFile = {
  file: File
  rawData: string[][]
  columns: string[]
}

export type PreviewMode = "input" | "configured" | "processed" | "template"

// Generate a random 4-letter code
const generateRandomCode = () => {
  const characters = "abcdefghijklmnopqrstuvwxyz"
  let result = ""
  for (let i = 0; i < 4; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

// Format date for unique ID
const formatDateForId = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const seconds = String(date.getSeconds()).padStart(2, "0")

  return `${year}${month}${day}_${hours}${minutes}${seconds}`
}

export function SpreadsheetProcessor() {
  const [inputFiles, setInputFiles] = useState<InputFile[]>([])
  const [configuredData, setConfiguredData] = useState<DataRow[]>([])
  const [processedData, setProcessedData] = useState<DataRow[]>([])
  const [templateData, setTemplateData] = useState<DataRow[]>([])
  const [previewData, setPreviewData] = useState<DataRow[]>([])
  const [previewMode, setPreviewMode] = useState<PreviewMode>("processed")
  const [allColumns, setAllColumns] = useState<string[]>([])
  const [supportSheets, setSupportSheets] = useState<SupportSheet[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [activePreset, setActivePreset] = useState<Preset>({
    id: "default",
    name: "Default Preset",
    headerRow: 0,
    selectedColumns: [],
    filters: [],
    transformations: [],
    includeSourceFileColumn: true,
    templateMapping: null,
  })
  const [presets, setPresets] = useState<Preset[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [validationWarning, setValidationWarning] = useState<string | null>(null)
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [formulaErrorCount, setFormulaErrorCount] = useState(0)
  const [lastFormulaError, setLastFormulaError] = useState<string | null>(null)
  const [usePlaceholderHeader, setUsePlaceholderHeader] = useState(false)
  const [placeholderHeaders, setPlaceholderHeaders] = useState<string[]>([])

  // Function to check for missing lookup values across all XLOOKUP transformations
  const checkForMissingLookupValues = useCallback(() => {
    const xlookupTransforms = activePreset.transformations.filter((t) => t.type === "xlookup")

    if (xlookupTransforms.length === 0 || configuredData.length === 0) {
      return { hasMissing: false, transformsWithMissing: [] }
    }

    const transformsWithMissing: Array<{ transform: Transformation; missingCount: number }> = []

    xlookupTransforms.forEach((transform, transformIndex) => {
      // Get the actual index in the full transformations array
      const actualIndex = activePreset.transformations.findIndex((t) => t.id === transform.id)

      if (transform.lookupSheet && transform.lookupColumn && transform.sourceColumns.length > 0) {
        // Simulate the data processing up to this transformation
        let processedData = configuredData.map((row) => ({ ...row }))

        // Apply previous transformations
        for (let i = 0; i < actualIndex; i++) {
          const prevTransform = activePreset.transformations[i]
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

        // Check for missing values
        const lookupColumn = transform.sourceColumns[0]
        const allLookupValues = new Set<string>()

        processedData.forEach((row) => {
          const lookupValue = row[lookupColumn]
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

        let missingCount = 0
        allLookupValues.forEach((lookupValue) => {
          let found = false

          if (transform.lookupSheet === "main") {
            found = processedData.some((r) => {
              const compareValue = r[transform.lookupColumn!]
              return (
                compareValue === lookupValue ||
                String(compareValue).trim() === String(lookupValue).trim() ||
                String(compareValue).toLowerCase().trim() === String(lookupValue).toLowerCase().trim()
              )
            })
          } else {
            const supportSheet = supportSheets.find((s) => s.id === transform.lookupSheet)
            if (supportSheet) {
              found = supportSheet.data.some((r) => {
                const compareValue = r[transform.lookupColumn!]
                return (
                  compareValue === lookupValue ||
                  String(compareValue).trim() === String(lookupValue).trim() ||
                  String(compareValue).toLowerCase().trim() === String(lookupValue).toLowerCase().trim()
                )
              })
            }
          }

          if (!found) {
            missingCount++
          }
        })

        if (missingCount > 0) {
          transformsWithMissing.push({ transform, missingCount })
        }
      }
    })

    return {
      hasMissing: transformsWithMissing.length > 0,
      transformsWithMissing,
    }
  }, [activePreset.transformations, configuredData, supportSheets])

  // Load presets from localStorage on initial render
  useEffect(() => {
    const savedPresets = localStorage.getItem("spreadsheetPresets")
    if (savedPresets) {
      try {
        const parsedPresets = JSON.parse(savedPresets)

        // Add new fields if they don't exist in saved presets
        const updatedPresets = parsedPresets.map((preset: any) => ({
          ...preset,
          includeSourceFileColumn: preset.includeSourceFileColumn ?? true,
          templateMapping: preset.templateMapping ?? null,
        }))

        setPresets(updatedPresets)
      } catch (e) {
        console.error("Failed to parse saved presets", e)
      }
    }

    const savedSupportSheets = localStorage.getItem("spreadsheetSupportSheets")
    if (savedSupportSheets) {
      try {
        // Load metadata and data, but not the actual files
        const parsedSheets = JSON.parse(savedSupportSheets)
        console.log("Loaded support sheets:", parsedSheets)

        setSupportSheets(
          parsedSheets.map((sheet: any) => ({
            ...sheet,
            file: null, // Files can't be stored in localStorage
            // Ensure data is properly loaded
            data: Array.isArray(sheet.data) ? sheet.data : [],
            columns: Array.isArray(sheet.columns) ? sheet.columns : [],
          })),
        )
      } catch (e) {
        console.error("Failed to parse saved support sheets", e)
      }
    }

    const savedTemplates = localStorage.getItem("spreadsheetTemplates")
    if (savedTemplates) {
      try {
        // Load templates
        const parsedTemplates = JSON.parse(savedTemplates)
        console.log("Loaded templates:", parsedTemplates)

        setTemplates(
          parsedTemplates.map((template: any) => ({
            ...template,
            file: null, // Files can't be stored in localStorage
            columns: Array.isArray(template.columns) ? template.columns : [],
            valueOptions: template.valueOptions ?? {},
          })),
        )
      } catch (e) {
        console.error("Failed to parse saved templates", e)
      }
    }
  }, [])

  // Save presets to localStorage whenever they change
  useEffect(() => {
    if (presets.length > 0) {
      localStorage.setItem("spreadsheetPresets", JSON.stringify(presets))
    }
  }, [presets])

  // Save support sheets metadata to localStorage
  useEffect(() => {
    if (supportSheets.length > 0) {
      try {
        // Save metadata and data, but not the actual file objects
        const sheetsToSave = supportSheets.map((sheet) => ({
          id: sheet.id,
          name: sheet.name,
          columns: sheet.columns,
          data: sheet.data, // Include the full data
          uniqueId: sheet.uniqueId,
          originalFileName: sheet.originalFileName,
          uploadDateTime: sheet.uploadDateTime,
          lastEditedDateTime: sheet.lastEditedDateTime,
        }))

        // Use a more reliable storage method for larger data
        // Break it into chunks if needed
        const jsonData = JSON.stringify(sheetsToSave)
        localStorage.setItem("spreadsheetSupportSheets", jsonData)

        // Log the size for debugging
        console.log(`Support sheets data size: ${jsonData.length} bytes`)
      } catch (error) {
        console.error("Error saving support sheets:", error)
      }
    }
  }, [supportSheets])

  // Save templates to localStorage
  useEffect(() => {
    if (templates.length > 0) {
      try {
        // Save templates without file objects
        const templatesToSave = templates.map((template) => ({
          id: template.id,
          name: template.name,
          columns: template.columns,
          valueOptions: template.valueOptions ?? {},
          uploadDateTime: template.uploadDateTime,
          lastEditedDateTime: template.lastEditedDateTime,
        }))
        const jsonData = JSON.stringify(templatesToSave)
        localStorage.setItem("spreadsheetTemplates", jsonData)
      } catch (error) {
        console.error("Error saving templates:", error)
      }
    }
  }, [templates])

  // Check for missing support sheets in transformations
  useEffect(() => {
    if (activePreset && activePreset.transformations && supportSheets.length > 0) {
      const updatedTransformations = activePreset.transformations.map((transform) => {
        if (transform.type === "xlookup" && transform.lookupSheet && transform.lookupSheet !== "main") {
          const sheet = supportSheets.find((s) => s.id === transform.lookupSheet)
          if (!sheet) {
            // Store the sheet name and last edited time for reference
            return {
              ...transform,
              lookupSheetName: transform.lookupSheetName || transform.lookupSheet,
              lookupSheetLastEdited: transform.lookupSheetLastEdited || "unknown",
            }
          } else {
            // Update the reference with current sheet name
            return {
              ...transform,
              lookupSheetName: sheet.name,
              lookupSheetLastEdited: sheet.lastEditedDateTime,
            }
          }
        }
        return transform
      })

      if (JSON.stringify(updatedTransformations) !== JSON.stringify(activePreset.transformations)) {
        setActivePreset({
          ...activePreset,
          transformations: updatedTransformations,
        })
      }
    }
  }, [activePreset, supportSheets])

  // Validate input files when they change or when header row changes
  useEffect(() => {
    if (inputFiles.length <= 1) {
      setValidationError(null)
      setValidationWarning(null)
      return
    }

    // Check if all files have data
    const emptyFiles = inputFiles.filter((file) => !file.rawData || file.rawData.length === 0)
    if (emptyFiles.length > 0) {
      return
    }

    // Get columns after applying header row
    const filesWithColumns = inputFiles.map((file) => {
      const headerRow = activePreset.headerRow
      if (file.rawData.length <= headerRow) {
        return { file: file.file, columns: [] }
      }
      return {
        file: file.file,
        columns: file.rawData[headerRow],
      }
    })

    // Check if all files have the same number of columns
    const columnCounts = filesWithColumns.map((f) => f.columns.length)
    const allSameColumnCount = columnCounts.every((count) => count === columnCounts[0])

    if (!allSameColumnCount) {
      setValidationError("Files have different numbers of columns. All input files must have the same structure and column names.")
      return
    } else {
      setValidationError(null)
    }

    // Check if all files have the same column names
    const firstFileColumns = filesWithColumns[0].columns
    const filesWithDifferentColumns = filesWithColumns.filter((f) => {
      return !arraysEqual(f.columns, firstFileColumns)
    })

    if (filesWithDifferentColumns.length > 0) {
      const fileNames = filesWithDifferentColumns.map((f) => f.file.name).join(", ")
      setValidationWarning(
        `Some files have different column names: ${fileNames}. The column names from the first file will be used.`,
      )
    } else {
      setValidationWarning(null)
    }
  }, [inputFiles, activePreset.headerRow])

  // Helper function to compare arrays
  const arraysEqual = (a: any[], b: any[]) => {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false
    }
    return true
  }

  const updatePreview = useCallback(() => {
    if (inputFiles.length === 0 || inputFiles[0].rawData.length === 0) return
    if (validationError) return

    setIsProcessing(true)
    setFormulaErrorCount(0)
    setLastFormulaError(null)

    try {
      // Get the first file's data for headers
      const firstFile = inputFiles[0]
      let headers: string[] = []
      let headerRow = activePreset.headerRow
      if (usePlaceholderHeader) {
        headers = placeholderHeaders
        headerRow = -1 // so we don't skip any rows
      } else {
        headers = firstFile.rawData[headerRow]
      }

      // Combine data from all files
      let allDataWithHeaders: DataRow[] = []

      inputFiles.forEach((inputFile) => {
        // Skip files with no data
        if (!inputFile.rawData || inputFile.rawData.length === 0) return

        // If using placeholder header, treat all rows as data
        const dataRows = usePlaceholderHeader ? inputFile.rawData : inputFile.rawData.slice(headerRow + 1)
        const fileData = dataRows.map((row) => {
          const obj: Record<string, any> = {}

          // Add source file column if enabled
          if (activePreset.includeSourceFileColumn) {
            obj["Source File"] = inputFile.file.name
          }

          // Add data columns
          headers.forEach((header, index) => {
            if (header && index < row.length) {
              obj[header] = row[index]
            }
          })

          return obj
        })

        allDataWithHeaders = [...allDataWithHeaders, ...fileData]
      })

      // Store raw input data for preview
      const inputPreviewData = allDataWithHeaders.slice(0, 30)

      // Apply column selection
      let filteredData = allDataWithHeaders.map((row) => {
        const filteredRow: Record<string, any> = {}

        // Always include source file column if enabled
        if (activePreset.includeSourceFileColumn && row["Source File"]) {
          filteredRow["Source File"] = row["Source File"]
        }

        // Add selected columns
        activePreset.selectedColumns.forEach((colIndex) => {
          if (row.hasOwnProperty(headers[colIndex])) {
            filteredRow[headers[colIndex]] = row[headers[colIndex]]
          }
        })

        return filteredRow
      })

      // Store configured data for preview
      setConfiguredData(filteredData)
      const configuredPreviewData = filteredData.slice(0, 30)

      // Apply filters
      if (activePreset.filters.length > 0) {
        filteredData = filteredData.filter((row) => {
          return activePreset.filters.every((filter) => {
            const value = row[filter.column]
            switch (filter.operator) {
              case "equals":
                return value === filter.value
              case "contains":
                if (filter.caseSensitive) {
                  return String(value).includes(filter.value)
                } else {
                  return String(value).toLowerCase().includes(String(filter.value).toLowerCase())
                }
              case "greaterThan":
                return Number(value) > Number(filter.value)
              case "lessThan":
                return Number(value) < Number(filter.value)
              default:
                return true
            }
          })
        })
      }

      // Apply transformations sequentially, building up the data row by row
      const transformedData = filteredData.map((row) => {
        const newRow = { ...row }

        // Apply each transformation in order, so later transformations can use results from earlier ones
        activePreset.transformations.forEach((transform) => {
          switch (transform.type) {
            case "multiply":
              if (transform.sourceColumns.length === 2) {
                newRow[transform.newColumnName] =
                  Number(newRow[transform.sourceColumns[0]]) * Number(newRow[transform.sourceColumns[1]])
              }
              break
            case "add":
              if (transform.sourceColumns.length === 2) {
                newRow[transform.newColumnName] =
                  Number(newRow[transform.sourceColumns[0]]) + Number(newRow[transform.sourceColumns[1]])
              }
              break
            case "subtract":
              if (transform.sourceColumns.length === 2) {
                newRow[transform.newColumnName] =
                  Number(newRow[transform.sourceColumns[0]]) - Number(newRow[transform.sourceColumns[1]])
              }
              break
            case "divide":
              if (transform.sourceColumns.length === 2) {
                newRow[transform.newColumnName] =
                  Number(newRow[transform.sourceColumns[0]]) / Number(newRow[transform.sourceColumns[1]])
              }
              break
            case "concat":
              newRow[transform.newColumnName] = transform.sourceColumns.map((col) => newRow[col]).join("")
              break
            case "xlookup":
              if (
                transform.lookupSheet &&
                transform.lookupColumn &&
                transform.returnColumn &&
                transform.sourceColumns.length > 0
              ) {
                const lookupValue = newRow[transform.sourceColumns[0]]
                let result = null

                if (transform.lookupSheet === "main") {
                  // Look up in the main dataset (use the current state of transformedData)
                  const foundRow = filteredData.find((r) => {
                    const compareValue = r[transform.lookupColumn!]

                    // Try exact match first
                    if (compareValue === lookupValue) return true

                    // Try trimmed string comparison
                    if (String(compareValue).trim() === String(lookupValue).trim()) return true

                    // Try case-insensitive comparison
                    if (String(compareValue).toLowerCase().trim() === String(lookupValue).toLowerCase().trim())
                      return true

                    return false
                  })
                  if (foundRow) {
                    result = foundRow[transform.returnColumn!]
                  }
                } else {
                  // Look up in a support sheet
                  const supportSheet = supportSheets.find((s) => s.id === transform.lookupSheet)
                  if (supportSheet) {
                    const foundRow = supportSheet.data.find((r) => {
                      const compareValue = r[transform.lookupColumn!]

                      // Try exact match first
                      if (compareValue === lookupValue) return true

                      // Try trimmed string comparison
                      if (String(compareValue).trim() === String(lookupValue).trim()) return true

                      // Try case-insensitive comparison
                      if (String(compareValue).toLowerCase().trim() === String(lookupValue).toLowerCase().trim())
                        return true

                      return false
                    })
                    if (foundRow) {
                      result = foundRow[transform.returnColumn!]
                    }
                  }
                }

                // Add debug info to help troubleshoot
                if (result === null) {
                  newRow[transform.newColumnName] = `Not found: "${lookupValue}"`
                } else {
                  newRow[transform.newColumnName] = result
                }
              }
              break
            case "custom":
              if (transform.formula) {
                try {
                  // Create a safe evaluation context with column values (use current newRow state)
                  const evalContext: Record<string, any> = {}
                  Object.keys(newRow).forEach((key) => {
                    // Replace spaces and special characters for variable names
                    const safeKey = key.replace(/[^a-zA-Z0-9_]/g, "_")
                    evalContext[safeKey] = Number(newRow[key]) || newRow[key]
                  })

                  // Replace column names with their safe versions in the formula
                  let safeFormula = transform.formula
                  Object.keys(newRow).forEach((key) => {
                    const safeKey = key.replace(/[^a-zA-Z0-9_]/g, "_")
                    safeFormula = safeFormula.replace(new RegExp(`\\b${key}\\b`, "g"), safeKey)
                  })

                  // Evaluate the formula in the context
                  const result = new Function(...Object.keys(evalContext), `return ${safeFormula}`)(
                    ...Object.values(evalContext),
                  )
                  newRow[transform.newColumnName] = result
                } catch (e) {
                  setFormulaErrorCount((c) => c + 1)
                  setLastFormulaError((e as Error).message || String(e))
                  // Suppress console.error
                  newRow[transform.newColumnName] = "Error"
                }
              }
              break
          }
        })

        return newRow
      })

      // Store the fully processed data
      setProcessedData(transformedData)

      // Generate template data if a template is selected
      let filledTemplateData: DataRow[] = []
      if (activePreset.templateMapping && activePreset.templateMapping.templateId) {
        const selectedTemplate = templates.find((t) => t.id === activePreset.templateMapping?.templateId)

        if (selectedTemplate) {
          // Create a row for each processed data row
          filledTemplateData = transformedData.map((processedRow) => {
            const templateRow: DataRow = {}

            // Fill in each template column
            selectedTemplate.columns.forEach((column) => {
              const mapping = activePreset.templateMapping?.columnMappings[column.name]
              if (column.constant !== null) {
                // Use constant value from template file
                templateRow[column.name] = column.constant
              } else if (mapping && mapping.startsWith && mapping.startsWith('CONST:')) {
                // Use constant value from mapping
                templateRow[column.name] = mapping.replace(/^CONST:/, '')
              } else {
                // Use mapped processed column if available
                templateRow[column.name] = mapping && processedRow[mapping] ? processedRow[mapping] : ""
              }
            })

            return templateRow
          })
        }
      }

      // Store the template data
      setTemplateData(filledTemplateData)

      // Update the preview based on selected mode
      switch (previewMode) {
        case "input":
          setPreviewData(inputPreviewData)
          break
        case "configured":
          setPreviewData(configuredPreviewData)
          break
        case "template":
          setPreviewData(filledTemplateData.slice(0, 30))
          break
        case "processed":
        default:
          setPreviewData(transformedData.slice(0, 30))
          break
      }
    } catch (error) {
      console.error("Error processing data", error)
    } finally {
      setIsProcessing(false)
    }
  }, [activePreset, previewMode, inputFiles, supportSheets, templates, validationError, placeholderHeaders])

  // Set up preview refresh timer
  useEffect(() => {
    if (inputFiles.length > 0 && !validationError) {
      updatePreview()

      previewTimerRef.current = setInterval(() => {
        updatePreview()
      }, 3000)
    }

    return () => {
      if (previewTimerRef.current) {
        clearInterval(previewTimerRef.current)
      }
    }
  }, [inputFiles, updatePreview, validationError])

  const handleFilesUpload = async (files: File[]) => {
    setValidationError(null)
    setValidationWarning(null)

    if (files.length === 0) {
      setInputFiles([])
      setAllColumns([])
      return
    }

    try {
      // Process all files
      const processedFiles: InputFile[] = []

      for (const file of files) {
        const rawData = await readFile(file)
        let columns = rawData.length > 0 ? rawData[0] : []
        let dataRows = rawData
        if (usePlaceholderHeader) {
          // Use placeholder headers and treat all rows as data
          const maxCols = rawData.reduce((max, row) => Math.max(max, row.length), 0)
          columns = Array.from({ length: maxCols }, (_, i) => `Column ${i + 1}`)
          dataRows = rawData // all rows are data
        }
        processedFiles.push({
          file,
          rawData: dataRows,
          columns,
        })
      }

      setInputFiles(processedFiles)

      // Set columns from the first file
      if (processedFiles.length > 0) {
        let firstFileHeaders = processedFiles[0].columns
        if (usePlaceholderHeader) {
          firstFileHeaders = processedFiles[0].columns
        } else if (processedFiles[0].rawData.length > 0) {
          firstFileHeaders = processedFiles[0].rawData[0]
        }
        setAllColumns(firstFileHeaders)

        // Update selected columns in the active preset
        setActivePreset((prev) => ({
          ...prev,
          selectedColumns: firstFileHeaders.map((_, idx) => idx),
        }))
      }
    } catch (error) {
      console.error("Error processing files:", error)
    }
  }

  const readFile = async (file: File): Promise<string[][]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        const result = e.target?.result
        if (!result) {
          reject(new Error("Failed to read file"))
          return
        }

        try {
          if (file.name.endsWith(".csv") || file.name.endsWith(".txt")) {
            Papa.parse(result as string, {
              complete: (results) => {
                resolve(results.data as string[][])
              },
              error: (error: Error) => {
                reject(error)
              },
            })
          } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
            const data = new Uint8Array(result as ArrayBuffer)
            const workbook = XLSX.read(data, { type: "array" })
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
            resolve(jsonData as string[][])
          } else {
            reject(new Error("Unsupported file format"))
          }
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => {
        reject(new Error("File reading error"))
      }

      if (file.name.endsWith(".csv") || file.name.endsWith(".txt")) {
        reader.readAsText(file)
      } else {
        reader.readAsArrayBuffer(file)
      }
    })
  }

  const handleSavePreset = (preset: Preset) => {
    const existingIndex = presets.findIndex((p) => p.id === preset.id)

    if (existingIndex >= 0) {
      // Update existing preset
      const updatedPresets = [...presets]
      updatedPresets[existingIndex] = preset
      setPresets(updatedPresets)
    } else {
      // Add new preset
      setPresets([...presets, preset])
    }

    setActivePreset(preset)
  }

  const handleLoadPreset = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId)
    if (preset) {
      setActivePreset(preset)
    }
  }

  const handleDeletePreset = (presetId: string) => {
    setPresets(presets.filter((p) => p.id !== presetId))

    // If the active preset was deleted, set to default
    if (activePreset.id === presetId) {
      setActivePreset({
        id: "default",
        name: "Default Preset",
        headerRow: 0,
        selectedColumns: allColumns.map((_, idx) => idx),
        filters: [],
        transformations: [],
        includeSourceFileColumn: true,
        templateMapping: null,
      })
    }
  }

  const handleImportPresets = (importedPresets: Preset[]) => {
    // Add a basic migration for presets from older versions
    const sanitizedPresets = importedPresets.map((preset: any) => ({
      ...preset,
      id: preset.id ?? `preset_${Date.now()}`,
      name: preset.name ?? "Untitled Preset",
      headerRow: preset.headerRow ?? 0,
      selectedColumns: preset.selectedColumns ?? [],
      filters: preset.filters ?? [],
      transformations: preset.transformations ?? [],
      includeSourceFileColumn: preset.includeSourceFileColumn ?? true,
      templateMapping: preset.templateMapping ?? null,
    }))

    setPresets(sanitizedPresets)

    // Set the first imported preset as active, or default if the file is empty
    if (sanitizedPresets.length > 0) {
      setActivePreset(sanitizedPresets[0])
    } else {
      setActivePreset({
        id: "default",
        name: "Default Preset",
        headerRow: 0,
        selectedColumns: allColumns.map((_, idx) => idx),
        filters: [],
        transformations: [],
        includeSourceFileColumn: true,
        templateMapping: null,
      })
    }
  }

  const handleReset = () => {
    setInputFiles([])
    setProcessedData([])
    setConfiguredData([])
    setTemplateData([])
    setPreviewData([])
    setAllColumns([])
    setValidationError(null)
    setValidationWarning(null)

    if (previewTimerRef.current) {
      clearInterval(previewTimerRef.current)
    }
  }

  const handleExport = (format: "csv" | "xlsx") => {
    if (!processedData.length) return

    // Export processed data
    if (format === "csv") {
      const csv = Papa.unparse(processedData)
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
      saveAs(blob, `processed_data_${new Date().toISOString().slice(0, 10)}.csv`)
    } else {
      const worksheet = XLSX.utils.json_to_sheet(processedData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Processed Data")

      // If template data exists, add it as a second sheet
      if (templateData.length > 0) {
        const templateWorksheet = XLSX.utils.json_to_sheet(templateData)
        XLSX.utils.book_append_sheet(workbook, templateWorksheet, "Template Data")
      }

      XLSX.writeFile(workbook, `processed_data_${new Date().toISOString().slice(0, 10)}.xlsx`)
    }

    // If template data exists and format is CSV, export it as a separate file
    if (templateData.length > 0 && format === "csv") {
      const templateCsv = Papa.unparse(templateData)
      const templateBlob = new Blob([templateCsv], { type: "text/csv;charset=utf-8" })
      saveAs(templateBlob, `template_data_${new Date().toISOString().slice(0, 10)}.csv`)
    }
  }

  const handleAddSupportSheet = async (file: File, name: string) => {
    if (file.size > 100 * 1024 * 1024) {
      alert("File size exceeds the 100MB limit")
      return
    }

    try {
      const rawSheetData = await readFile(file)

      if (rawSheetData.length > 0) {
        const headers = rawSheetData[0]

        // Convert to objects
        const dataWithHeaders = rawSheetData.slice(1).map((row) => {
          const obj: Record<string, any> = {}
          headers.forEach((header, index) => {
            if (header) {
              obj[header] = row[index]
            }
          })
          return obj
        })

        // Generate unique ID
        const fileNameParts = file.name.split(".")
        const extension = fileNameParts.pop() || ""
        const fileName = fileNameParts.join(".")
        const now = new Date()
        const dateStr = formatDateForId(now)
        const randomCode = generateRandomCode()
        const uniqueId = `${fileName}_${extension}_${dateStr}_${randomCode}`

        const newSheet: SupportSheet = {
          id: `sheet_${Date.now()}`,
          name,
          file,
          data: dataWithHeaders,
          columns: headers,
          uniqueId,
          originalFileName: file.name,
          uploadDateTime: now.toISOString(),
          lastEditedDateTime: now.toISOString(),
        }

        setSupportSheets([...supportSheets, newSheet])
      }
    } catch (error) {
      console.error("Error processing support sheet", error)
      alert("Failed to process support sheet")
    }
  }

  const handleUpdateSupportSheet = (id: string, updates: Partial<SupportSheet>) => {
    setSupportSheets(supportSheets.map((sheet) => (sheet.id === id ? { ...sheet, ...updates } : sheet)))
  }

  const handleDeleteSupportSheet = (id: string) => {
    setSupportSheets(supportSheets.filter((sheet) => sheet.id !== id))
  }

  const handleExportSupportSheet = (id: string, format: "csv" | "xlsx") => {
    const sheet = supportSheets.find((s) => s.id === id)
    if (!sheet || !sheet.data.length) return

    if (format === "csv") {
      const csv = Papa.unparse(sheet.data)
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
      saveAs(blob, `${sheet.name}_${new Date().toISOString().slice(0, 10)}.csv`)
    } else {
      const worksheet = XLSX.utils.json_to_sheet(sheet.data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name)
      XLSX.writeFile(workbook, `${sheet.name}_${new Date().toISOString().slice(0, 10)}.xlsx`)
    }
  }

  // Template management functions
  const handleAddTemplate = async (file: File, name: string, useSecondRowAsConstants: boolean) => {
    if (file.size > 100 * 1024 * 1024) {
      alert("File size exceeds the 100MB limit")
      return
    }

    try {
      const rawTemplateData = await readFile(file)

      if (rawTemplateData.length > 0) {
        // Only use the header row
        const headers = rawTemplateData[0]
        let templateColumns: TemplateColumn[]
        if (useSecondRowAsConstants && rawTemplateData.length > 1) {
          const secondRow = rawTemplateData[1]
          templateColumns = headers.map((header, idx) => ({
            name: header,
            constant: secondRow[idx] !== undefined && secondRow[idx] !== "" ? String(secondRow[idx]) : null,
          }))
        } else {
          templateColumns = headers.map((header) => ({
            name: header,
            constant: null,
          }))
        }

        // Extract unique values for each column from rows 5-500 (indices 4-499)
        const valueOptions: Record<string, string[]> = {}
        if (rawTemplateData.length > 4) {
          headers.forEach((header, colIdx) => {
            const values = rawTemplateData.slice(4, 500).map(row => row[colIdx]).filter(v => v !== undefined && v !== null && v !== "")
            valueOptions[header] = Array.from(new Set(values.map(String)))
          })
        }

        const now = new Date()

        const newTemplate: Template = {
          id: `template_${Date.now()}`,
          name,
          file,
          columns: templateColumns,
          valueOptions,
          uploadDateTime: now.toISOString(),
          lastEditedDateTime: now.toISOString(),
        }

        setTemplates([...templates, newTemplate])
      }
    } catch (error) {
      console.error("Error processing template", error)
      alert("Failed to process template")
    }
  }

  const handleUpdateTemplate = (id: string, updates: Partial<Template>) => {
    setTemplates(templates.map((template) => (template.id === id ? { ...template, ...updates } : template)))
  }

  const handleDeleteTemplate = (id: string) => {
    setTemplates(templates.filter((template) => template.id !== id))

    // If the active preset uses this template, remove the mapping
    if (activePreset.templateMapping?.templateId === id) {
      setActivePreset({
        ...activePreset,
        templateMapping: null,
      })
    }
  }

  const handleExportTemplate = (id: string, format: "csv" | "xlsx") => {
    const template = templates.find((t) => t.id === id)
    if (!template) return

    // Create a single row with constants (if any)
    const templateRow: Record<string, any> = {}
    template.columns.forEach((column) => {
      templateRow[column.name] = column.constant !== null ? column.constant : ""
    })

    if (format === "csv") {
      const csv = Papa.unparse([templateRow])
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
      saveAs(blob, `${template.name}_template_${new Date().toISOString().slice(0, 10)}.csv`)
    } else {
      const worksheet = XLSX.utils.json_to_sheet([templateRow])
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, template.name)
      XLSX.writeFile(workbook, `${template.name}_template_${new Date().toISOString().slice(0, 10)}.xlsx`)
    }
  }

  const handleUpdateTemplateColumn = (templateId: string, columnName: string, updates: Partial<TemplateColumn>) => {
    setTemplates(
      templates.map((template) => {
        if (template.id === templateId) {
          const updatedColumns = template.columns.map((column) => {
            if (column.name === columnName) {
              return { ...column, ...updates }
            }
            return column
          })
          return { ...template, columns: updatedColumns }
        }
        return template
      }),
    )
  }

  // Template mapping functions
  const handleTemplateSelect = (templateId: string | null) => {
    if (!templateId) {
      setActivePreset({
        ...activePreset,
        templateMapping: null,
      })
      return
    }

    // Initialize empty mapping for the selected template
    const selectedTemplate = templates.find((t) => t.id === templateId)
    if (selectedTemplate) {
      const columnMappings: Record<string, string | null> = {}
      selectedTemplate.columns.forEach((column) => {
        // Only add mappable columns (those without constants)
        if (column.constant === null) {
          columnMappings[column.name] = null
        }
      })

      setActivePreset({
        ...activePreset,
        templateMapping: {
          templateId,
          columnMappings,
        },
      })
    }
  }

  const handleColumnMappingChange = (templateColumn: string, value: string | null) => {
    if (!activePreset.templateMapping) return

    setActivePreset({
      ...activePreset,
      templateMapping: {
        ...activePreset.templateMapping,
        columnMappings: {
          ...activePreset.templateMapping.columnMappings,
          [templateColumn]: value,
        },
      },
    })
  }

  // Update preview when active preset changes
  useEffect(() => {
    if (inputFiles.length > 0 && !validationError) {
      updatePreview()
    }
  }, [inputFiles, activePreset, updatePreview, validationError])

  // Toggle source file column inclusion
  const handleToggleSourceFileColumn = (value: boolean) => {
    setActivePreset({
      ...activePreset,
      includeSourceFileColumn: value,
    })
  }

  // Get all processed columns for template mapping
  const getProcessedColumns = () => {
    if (!processedData.length) return []
    return Object.keys(processedData[0])
  }

  // Check for missing lookup values
  const missingLookupInfo = checkForMissingLookupValues()

  // Update columns and selectedColumns when usePlaceholderHeader, inputFiles, or headerRow changes
  useEffect(() => {
    if (inputFiles.length === 0) {
      setAllColumns([])
      setActivePreset((prev) => ({ ...prev, selectedColumns: [] }))
      setPlaceholderHeaders([])
      return
    }
    let newColumns: string[] = []
    if (usePlaceholderHeader) {
      // Generate placeholder headers based on the widest row
      const maxCols = inputFiles[0].rawData.reduce((max, row) => Math.max(max, row.length), 0)
      newColumns = Array.from({ length: maxCols }, (_, i) => `Column ${i + 1}`)
      setPlaceholderHeaders(newColumns)
    } else {
      // Use the header row from the active preset
      const headerRow = activePreset.headerRow
      newColumns = inputFiles[0].rawData.length > headerRow ? inputFiles[0].rawData[headerRow] : []
      setPlaceholderHeaders([])
    }
    setAllColumns(newColumns)
    setActivePreset((prev) => ({ ...prev, selectedColumns: newColumns.map((_, idx) => idx) }))
  }, [usePlaceholderHeader, inputFiles, activePreset.headerRow])

  // When placeholderHeaders changes in placeholder mode, update allColumns and selectedColumns
  useEffect(() => {
    if (usePlaceholderHeader && placeholderHeaders.length > 0) {
      setAllColumns(placeholderHeaders)
      setActivePreset((prev) => ({ ...prev, selectedColumns: placeholderHeaders.map((_, idx) => idx) }))
    }
  }, [placeholderHeaders, usePlaceholderHeader])

  // Compute preview headers and rows for DataConfigPanel
  let previewHeaders: string[] = []
  let previewRows: string[][] = []
  if (inputFiles.length > 0) {
    if (usePlaceholderHeader) {
      previewHeaders = placeholderHeaders
      previewRows = inputFiles[0].rawData.slice(0, 10)
    } else {
      const headerRow = activePreset.headerRow
      previewHeaders = inputFiles[0].rawData[headerRow] || []
      previewRows = inputFiles[0].rawData.slice(headerRow + 1, headerRow + 11)
    }
  }

  return (
    <div className="w-full max-w-full space-y-6 overflow-x-hidden">
      <div>
        <div className="flex flex-col gap-4">
          <div className="w-full">
            <h2 className="text-xl font-semibold mb-4">Upload Spreadsheets</h2>
            <FileUploader onFilesUpload={handleFilesUpload} currentFiles={inputFiles.map((f) => f.file)} />
            {validationError && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            {validationWarning && (
              <Alert className="mt-4 bg-yellow-50 border-yellow-200">
                <Info className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-700">{validationWarning}</AlertDescription>
              </Alert>
            )}
            {formulaErrorCount > 0 && (
              <Alert className="mt-4 bg-yellow-50 border-yellow-200">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-700">
                  <div className="font-semibold mb-1">Some custom formulas could not be evaluated</div>
                  <div className="text-sm mb-1">{formulaErrorCount} formula error{formulaErrorCount > 1 ? 's' : ''} occurred during processing.</div>
                  {lastFormulaError && (
                    <div className="text-xs text-gray-600">Last error: {lastFormulaError}</div>
                  )}
                  <div className="text-xs mt-1">Check your custom formulas for typos or missing columns.</div>
                </AlertDescription>
              </Alert>
            )}
          </div>
          <div className="w-full border-t-4 border-blue-500 border-dotted my-6"></div>
          <div className="w-full">
            <h2 className="text-xl font-semibold mb-4">Presets</h2>
            <PresetManager
              presets={presets}
              activePreset={activePreset}
              onSavePreset={handleSavePreset}
              onLoadPreset={handleLoadPreset}
              onDeletePreset={handleDeletePreset}
              onImportPresets={handleImportPresets}
            />
          </div>
        </div>

        {inputFiles.length > 0 && (
          <>
            <div className="mt-4 w-full max-w-full space-y-6 overflow-x-hidden">
              {/* Templates Section */}
              <div className="w-full max-w-full">
                <div className="border-t-4 border-blue-500 border-dotted my-6"></div>
                <h2 className="text-xl font-semibold mb-4">Templates</h2>
                <TemplatesManager
                  templates={templates}
                  onAddTemplate={handleAddTemplate}
                  onUpdateTemplate={handleUpdateTemplate}
                  onDeleteTemplate={handleDeleteTemplate}
                  onExportTemplate={handleExportTemplate}
                  onUpdateTemplateColumn={handleUpdateTemplateColumn}
                />
              </div>

              {/* Support Sheets Section */}
              <div className="w-full max-w-full">
                <div className="border-t-4 border-blue-500 border-dotted my-6"></div>
                <h2 className="text-xl font-semibold mb-4">Support Sheets</h2>
                <SupportSheetsManager
                  supportSheets={supportSheets}
                  onAddSheet={handleAddSupportSheet}
                  onUpdateSheet={handleUpdateSupportSheet}
                  onDeleteSheet={handleDeleteSupportSheet}
                  onExportSheet={handleExportSupportSheet}
                />
              </div>

              {/* Data Configuration Section */}
              <div className="w-full max-w-full">
                <div className="border-t-4 border-blue-500 border-dotted my-6"></div>
                <h2 className="text-xl font-semibold mb-4">Data Configuration</h2>
                <div className="mb-4 flex items-center space-x-2">
                  <Switch
                    id="source-file-column"
                    checked={activePreset.includeSourceFileColumn}
                    onCheckedChange={handleToggleSourceFileColumn}
                  />
                  <Label htmlFor="source-file-column">Include source file column in output</Label>
                </div>
                <DataConfigPanel
                  rawData={inputFiles.length > 0 ? inputFiles[0].rawData : []}
                  allColumns={allColumns}
                  headerRow={activePreset.headerRow}
                  selectedColumns={activePreset.selectedColumns}
                  onHeaderRowChange={(row) => setActivePreset({ ...activePreset, headerRow: row })}
                  onSelectedColumnsChange={(cols) => setActivePreset({ ...activePreset, selectedColumns: cols })}
                  usePlaceholderHeader={usePlaceholderHeader}
                  onUsePlaceholderHeaderChange={setUsePlaceholderHeader}
                  previewHeaders={previewHeaders}
                  previewRows={previewRows}
                  placeholderHeaders={placeholderHeaders}
                  setPlaceholderHeaders={setPlaceholderHeaders}
                />
              </div>

              {/* Processing Rules Section */}
              <div className="w-full max-w-full">
                <div className="border-t-4 border-blue-500 border-dotted my-6"></div>
                <h2 className="text-xl font-semibold mb-4">Processing Rules</h2>
                <ProcessingPanel
                  allColumns={
                    activePreset.includeSourceFileColumn
                      ? ["Source File", ...allColumns]
                      : allColumns
                  }
                  supportSheets={supportSheets}
                  filters={activePreset.filters}
                  transformations={activePreset.transformations}
                  configuredData={configuredData}
                  onFiltersChange={(filters) => setActivePreset({ ...activePreset, filters })}
                  onTransformationsChange={(transformations) => setActivePreset({ ...activePreset, transformations })}
                />
              </div>

              {/* Filling Template Section */}
              <div className="w-full max-w-full">
                <div className="border-t-4 border-blue-500 border-dotted my-6"></div>
                <h2 className="text-xl font-semibold mb-4">Filling Template</h2>
                <TemplateFillingPanel
                  templates={templates}
                  processedColumns={getProcessedColumns()}
                  templateMapping={activePreset.templateMapping}
                  onTemplateSelect={handleTemplateSelect}
                  onColumnMappingChange={handleColumnMappingChange}
                />
              </div>
            </div>

            {!validationError && (
              <div className="mt-6 w-full max-w-full">
                <div className="border-t-4 border-blue-500 border-dotted my-6"></div>
                {/* Missing Lookup Values Warning Banner */}
                {missingLookupInfo.hasMissing && (
                  <Alert variant="destructive" className="mb-4 bg-red-50 border-red-200">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <div className="font-semibold mb-2">⚠️ Missing Lookup Values Detected</div>
                      <div className="text-sm space-y-1">
                        {missingLookupInfo.transformsWithMissing.map(({ transform, missingCount }) => (
                          <div key={transform.id}>
                            • <strong>{transform.newColumnName}</strong>: {missingCount} values could not be found
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 text-sm">
                        <strong>To fix this:</strong> Go to the <strong>"Processing Rules"</strong> section →
                        <strong>"Transformations"</strong> → Click the <strong>"Missing (X)"</strong> button next to
                        each XLOOKUP transformation to download the missing values and update your lookup sheets.
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <DataPreviewToggle
                  data={previewData}
                  mode={previewMode}
                  onModeChange={setPreviewMode}
                  onRefresh={updatePreview}
                  onReset={handleReset}
                  onExport={handleExport}
                  isProcessing={isProcessing}
                  showExport={processedData.length > 0}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}