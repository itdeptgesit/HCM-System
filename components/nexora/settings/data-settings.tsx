import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react"
import {
  Activity,
  AlertTriangle,
  Archive,
  Building2,
  CheckCircle2,
  Clock3,
  Contact,
  Database,
  Download,
  FileSpreadsheet,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  X,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"

// -----------------------------------------------------------------------------
// Data
// -----------------------------------------------------------------------------

type DataType = "leads" | "contacts" | "companies" | "deals" | "activities"

const initialCounts: Record<DataType, number> = {
  leads: 248,
  contacts: 186,
  companies: 64,
  deals: 92,
  activities: 415,
}

const dataTypes: { id: DataType; label: string; description: string; icon: LucideIcon; color: string }[] = [
  { id: "leads", label: "Leads", description: "Lead records and prospect information", icon: Users, color: "#3b82f6" },
  { id: "contacts", label: "Contacts", description: "People and customer contact details", icon: Contact, color: "#10b981" },
  { id: "companies", label: "Companies", description: "Organizations and account records", icon: Building2, color: "#8b5cf6" },
  { id: "deals", label: "Deals", description: "Sales opportunities and deal records", icon: Archive, color: "#f59e0b" },
  { id: "activities", label: "Activities", description: "Tasks, calls, meetings, and notes", icon: Activity, color: "#f43f5e" },
]

const sampleCsv: Record<DataType, string> = {
  leads: [
    "name,email,company,status,source",
    "Alex Morgan,alex@example.com,Acme Inc,New,Website",
    "Jamie Wilson,jamie@example.com,Northstar,Qualified,Referral",
  ].join("\n"),
  contacts: [
    "first_name,last_name,email,phone,company",
    "Alex,Morgan,alex@example.com,+1 555 0100,Acme Inc",
    "Jamie,Wilson,jamie@example.com,+1 555 0101,Northstar",
  ].join("\n"),
  companies: [
    "name,website,industry,location",
    "Acme Inc,https://example.com,Technology,New York",
    "Northstar,https://northstar.example,Finance,London",
  ].join("\n"),
  deals: [
    "name,company,value,stage,status",
    "Enterprise Plan,Acme Inc,12000,Negotiation,Open",
    "Annual Contract,Northstar,8500,Proposal,Open",
  ].join("\n"),
  activities: [
    "title,type,due_date,status",
    "Follow up with Acme,Call,2026-10-10,Pending",
    "Product demo,Meeting,2026-10-12,Scheduled",
  ].join("\n"),
}

const retentionOptions = [
  { value: "90", label: "90 days" },
  { value: "180", label: "180 days" },
  { value: "365", label: "1 year" },
  { value: "730", label: "2 years" },
  { value: "forever", label: "Keep indefinitely" },
]

interface Backup {
  id: number
  name: string
  date: string
  size: string
  status: "Completed"
}

interface UploadedCsv {
  file: File
  headers: string[]
  preview: string[][]
  rows: number
}

/** Minimal CSV line parser (handles quoted commas) for the preview table. */
function parseCsvLine(line: string) {
  const cells: string[] = []
  let current = ""
  let quoted = false

  for (const char of line) {
    if (char === '"') quoted = !quoted
    else if (char === "," && !quoted) {
      cells.push(current.trim())
      current = ""
    } else current += char
  }
  cells.push(current.trim())
  return cells
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// -----------------------------------------------------------------------------
// Small pieces
// -----------------------------------------------------------------------------

function Section({
  icon: Icon,
  title,
  description,
  danger = false,
  children,
}: {
  icon: LucideIcon
  title: string
  description: string
  danger?: boolean
  children: ReactNode
}) {
  return (
    <Card className={`gap-0 border py-0 shadow-xs ring-0 ${danger ? "border-destructive/30" : ""}`}>
      <div className="flex items-start gap-3 border-b p-5">
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${
            danger ? "border-destructive/20 bg-destructive/10 text-destructive" : "bg-muted/50 text-muted-foreground"
          }`}
        >
          <Icon className="size-4" />
        </div>
        <div>
          <h3 className={`text-base font-semibold leading-tight ${danger ? "text-destructive" : ""}`}>{title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </Card>
  )
}

function TypeChips({
  value,
  onChange,
  counts,
}: {
  value: DataType
  onChange: (type: DataType) => void
  counts?: Record<DataType, number>
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {dataTypes.map(({ id, label, description, icon: Icon }) => (
        <button
          key={id}
          type="button"
          title={description}
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            value === id ? "border-primary bg-primary/5" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          }`}
        >
          <Icon className="size-4" />
          {label}
          {counts && <span className="text-xs font-normal text-muted-foreground">{counts[id].toLocaleString()}</span>}
        </button>
      ))}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function DataSettings() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [counts, setCounts] = useState(initialCounts)
  const [importType, setImportType] = useState<DataType>("leads")
  const [upload, setUpload] = useState<UploadedCsv | null>(null)
  const [importError, setImportError] = useState("")
  const [dragging, setDragging] = useState(false)
  const [exportType, setExportType] = useState<DataType>("leads")
  const [retention, setRetention] = useState("365")
  const [backups, setBackups] = useState<Backup[]>([
    { id: 1, name: "Initial demo backup", date: "Oct 01, 2026", size: "2.4 MB", status: "Completed" },
  ])
  const [confirmClear, setConfirmClear] = useState(false)
  const [toast, setToast] = useState("")

  // Toast disappears on its own
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(""), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  const totalRecords = Object.values(counts).reduce((total, count) => total + count, 0)

  // ----- Import -----
  const loadFile = async (file: File | undefined) => {
    setImportError("")
    if (!file) return

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setUpload(null)
      return setImportError("Please select a CSV file.")
    }

    try {
      const lines = (await file.text()).split(/\r?\n/).filter((line) => line.trim())
      if (lines.length < 2) {
        setUpload(null)
        return setImportError("The CSV file must contain a header and at least one row.")
      }
      setUpload({
        file,
        headers: parseCsvLine(lines[0]),
        preview: lines.slice(1, 4).map(parseCsvLine),
        rows: lines.length - 1,
      })
    } catch {
      setUpload(null)
      setImportError("Unable to read this file. Please try another CSV.")
    }
  }

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setDragging(false)
    loadFile(event.dataTransfer.files[0])
  }

  const removeUpload = () => {
    setUpload(null)
    setImportError("")
  }

  const prepareImport = () => {
    if (!upload) return
    setToast(`Import preview ready for ${upload.file.name}. Backend integration is required to import records.`)
  }

  // ----- Export -----
  const exportSample = () => {
    downloadCsv(sampleCsv[exportType], `nexora-${exportType}-sample.csv`)
    setToast(`A sample CSV for ${exportType} has been downloaded. Connect the backend to export live CRM records.`)
  }

  // ----- Backups -----
  const createBackup = () => {
    setBackups((current) => [
      {
        id: Date.now(),
        name: `Demo backup ${current.length + 1}`,
        date: new Date().toLocaleString(),
        size: "Demo",
        status: "Completed",
      },
      ...current,
    ])
    setToast("Demo backup entry created locally. Actual backups require backend storage.")
  }

  // ----- Demo data -----
  const clearDemoData = () => {
    setCounts({ leads: 0, contacts: 0, companies: 0, deals: 0, activities: 0 })
    setConfirmClear(false)
    setToast("Demo counts have been cleared from this page.")
  }

  const resetDemoData = () => {
    setCounts(initialCounts)
    setConfirmClear(false)
    setToast("Demo counts have been restored.")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Data</h2>
        <p className="mt-1 text-sm text-muted-foreground">Import, export, and manage your workspace data.</p>
      </div>

      {/* Overview */}
      <Section icon={Database} title="Data overview" description="A summary of the records in your workspace.">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-3xl font-semibold tabular-nums tracking-tight">{totalRecords.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total records</p>
          </div>
        </div>

        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
          {totalRecords > 0 &&
            dataTypes.map(({ id, color }) => (
              <div
                key={id}
                className="h-full transition-all"
                style={{ width: `${(counts[id] / totalRecords) * 100}%`, backgroundColor: color }}
              />
            ))}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {dataTypes.map(({ id, label, description, icon: Icon, color }) => (
            <div key={id} title={description} className="rounded-lg border p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="flex size-6 items-center justify-center rounded-md" style={{ backgroundColor: `${color}1a`, color }}>
                  <Icon className="size-3.5" />
                </span>
                {label}
              </div>
              <p className="mt-2 text-xl font-semibold tabular-nums">{counts[id].toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                {totalRecords > 0 ? Math.round((counts[id] / totalRecords) * 100) : 0}% of total
              </p>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          These are sample counts for the frontend demo, not live database records.
        </p>
      </Section>

      {/* Import */}
      <Section icon={Upload} title="Import data" description="Upload a CSV file to prepare records for import into Nexora CRM.">
        <div className="space-y-2">
          <p className="text-sm font-medium">Import to</p>
          <TypeChips value={importType} onChange={setImportType} />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ""
            loadFile(file)
          }}
        />

        {!upload ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
              dragging ? "border-primary bg-primary/5" : "hover:border-foreground/30 hover:bg-muted/30"
            }`}
          >
            <span className="flex size-11 items-center justify-center rounded-full border bg-background text-muted-foreground">
              <Upload className="size-5" />
            </span>
            <span className="text-sm font-medium">Drop your CSV here, or click to browse</span>
            <span className="text-xs text-muted-foreground">CSV files only. The first row must be a header.</span>
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <FileSpreadsheet className="size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{upload.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {upload.rows} data rows · {(upload.file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={removeUpload}>
                Remove
              </Button>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    {upload.headers.map((header, i) => (
                      <th key={i} className="whitespace-nowrap px-3 py-2 font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {upload.preview.map((row, r) => (
                    <tr key={r}>
                      {upload.headers.map((_, c) => (
                        <td key={c} className="whitespace-nowrap px-3 py-2">
                          {row[c] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Showing the first {upload.preview.length} of {upload.rows} rows. This is a preview only; no records have
              been imported.
            </p>
          </div>
        )}

        {importError && <p className="text-sm text-destructive">{importError}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => downloadCsv(sampleCsv[importType], `nexora-${importType}-template.csv`)}
            className="text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Download a {importType} CSV template
          </button>
          <Button type="button" onClick={prepareImport} disabled={!upload}>
            <Upload className="mr-2 size-4" />
            Prepare import
          </Button>
        </div>
      </Section>

      {/* Export */}
      <Section icon={Download} title="Export data" description="Download a CSV sample for a CRM data category.">
        <div className="space-y-2">
          <p className="text-sm font-medium">Data type</p>
          <TypeChips value={exportType} onChange={setExportType} counts={counts} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            This downloads sample rows only. Live exports require backend integration.
          </p>
          <Button type="button" variant="outline" onClick={exportSample}>
            <Download className="mr-2 size-4" />
            Download CSV sample
          </Button>
        </div>
      </Section>

      {/* Backup */}
      <Section icon={HardDrive} title="Data backup" description="Review demo backup entries and prepare the backup interface.">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Workspace backup</p>
            <p className="text-sm text-muted-foreground">Create a local demo backup entry.</p>
          </div>
          <Button type="button" variant="outline" onClick={createBackup}>
            <RefreshCw className="mr-2 size-4" />
            Create backup
          </Button>
        </div>

        <ul className="divide-y rounded-lg border">
          {backups.map((backup) => (
            <li key={backup.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Archive className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{backup.name}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock3 className="size-3" />
                  {backup.date}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{backup.size}</span>
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" />
                {backup.status}
              </span>
            </li>
          ))}
        </ul>

        <p className="text-xs text-muted-foreground">
          Backup entries are stored in local component state only. No files or database snapshots are created.
        </p>
      </Section>

      {/* Retention */}
      <Section
        icon={ShieldCheck}
        title="Data retention"
        description="Choose how long workspace records should be retained. This is a frontend preference only."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Retention period</p>
          <div className="flex flex-wrap gap-2">
            {retentionOptions.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={retention === value}
                onClick={() => setRetention(value)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  retention === value
                    ? "border-primary bg-primary/5"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => setToast("Retention preference saved locally. Backend enforcement is not configured.")}
          >
            Save preference
          </Button>
        </div>
      </Section>

      {/* Danger zone */}
      <Section
        danger
        icon={AlertTriangle}
        title="Danger zone"
        description="Destructive demo actions. These do not affect a database."
      >
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium">Clear demo data</p>
            <p className="text-sm text-muted-foreground">Set the displayed sample record counts to zero.</p>
          </div>
          <Button type="button" variant="destructive" onClick={() => setConfirmClear(true)}>
            <Trash2 className="mr-2 size-4" />
            Clear demo data
          </Button>
        </div>

        {confirmClear && (
          <div className="flex flex-col gap-3 rounded-lg border border-destructive/25 bg-destructive/5 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">Clear the displayed record counts? This only changes this page's local state.</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setConfirmClear(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="destructive" onClick={clearDemoData}>
                Yes, clear
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium">Reset demo data</p>
            <p className="text-sm text-muted-foreground">Restore the original sample record counts.</p>
          </div>
          <Button type="button" variant="outline" onClick={resetDemoData}>
            <RefreshCw className="mr-2 size-4" />
            Reset demo data
          </Button>
        </div>
      </Section>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-sm">{toast}</p>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setToast("")}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}