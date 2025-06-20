import { SpreadsheetProcessor } from "@/components/spreadsheet-processor"

export default function Home() {
  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden">
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <h1 className="text-3xl font-bold mb-6">Spreadsheet Data Processor</h1>
        <SpreadsheetProcessor />
      </div>
    </main>
  )
}
