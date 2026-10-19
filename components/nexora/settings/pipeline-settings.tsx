import { useState, type FormEvent } from "react"
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  CirclePlus,
  GitBranch,
  GripVertical,
  Info,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

type StageType = "open" | "won" | "lost"

type PipelineStage = {
  id: number
  name: string
  probability: number
  type: StageType
}

const initialStages: PipelineStage[] = [
  { id: 1, name: "New Lead", probability: 10, type: "open" },
  { id: 2, name: "Qualified", probability: 25, type: "open" },
  { id: 3, name: "Proposal", probability: 50, type: "open" },
  { id: 4, name: "Negotiation", probability: 75, type: "open" },
  { id: 5, name: "Won", probability: 100, type: "won" },
  { id: 6, name: "Lost", probability: 0, type: "lost" },
]

const stageTypeLabels: Record<StageType, string> = {
  open: "Open",
  won: "Won",
  lost: "Lost",
}

export function PipelineSettings() {
  const [pipelineName, setPipelineName] = useState("Sales Pipeline")
  const [description, setDescription] = useState(
    "Track and manage deals throughout your sales process."
  )
  const [stages, setStages] = useState<PipelineStage[]>(initialStages)
  const [showAddStage, setShowAddStage] = useState(false)
  const [newStageName, setNewStageName] = useState("")
  const [newStageProbability, setNewStageProbability] = useState("20")
  const [newStageType, setNewStageType] = useState<StageType>("open")
  const [savedStatus, setSavedStatus] = useState<string | null>(null)

  function updateStage(
    id: number,
    field: keyof Omit<PipelineStage, "id">,
    value: string | number
  ) {
    setStages((current) =>
      current.map((stage) =>
        stage.id === id ? { ...stage, [field]: value } : stage
      )
    )
    setSavedStatus(null)
  }

  function addStage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedName = newStageName.trim()
    if (!trimmedName) return

    const probability =
      newStageType === "won"
        ? 100
        : newStageType === "lost"
          ? 0
          : Math.min(100, Math.max(0, Number(newStageProbability) || 0))

    const newStage: PipelineStage = {
      id: Date.now(),
      name: trimmedName,
      probability,
      type: newStageType,
    }

    setStages((current) => {
      if (newStage.type === "won" || newStage.type === "lost") {
        return [...current, newStage]
      }

      const openStages = current.filter((stage) => stage.type === "open")
      const terminalStages = current.filter((stage) => stage.type !== "open")
      return [...openStages, newStage, ...terminalStages]
    })

    setNewStageName("")
    setNewStageProbability("20")
    setNewStageType("open")
    setShowAddStage(false)
    setSavedStatus(null)
  }

  function removeStage(id: number) {
    setStages((current) => current.filter((stage) => stage.id !== id))
    setSavedStatus(null)
  }

  function moveStage(id: number, direction: "up" | "down") {
    setStages((current) => {
      const index = current.findIndex((stage) => stage.id === id)
      if (index < 0) return current

      const targetIndex = direction === "up" ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= current.length) return current

      const target = current[targetIndex]
      const selected = current[index]

      if (selected.type !== "open" || target.type !== "open") {
        return current
      }

      const updated = [...current]
      updated[index] = target
      updated[targetIndex] = selected
      return updated
    })
    setSavedStatus(null)
  }

  function handleSave() {
    setSavedStatus("Pipeline settings saved successfully!")
    setTimeout(() => setSavedStatus(null), 3000)
  }

  function handleReset() {
    setPipelineName("Sales Pipeline")
    setDescription("Track and manage deals throughout your sales process.")
    setStages(initialStages)
    setSavedStatus(null)
  }

  const openStagesCount = stages.filter((stage) => stage.type === "open").length
  const wonStagesCount = stages.filter((stage) => stage.type === "won").length
  const lostStagesCount = stages.filter((stage) => stage.type === "lost").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Pipeline Settings</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Configure your sales stages, deal progression rules, and probability metrics.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleReset}
        >
          <RotateCcw className="mr-1.5 size-3.5" />
          Reset to defaults
        </Button>
      </div>

      <div className="space-y-6">
        {/* Section 1: Pipeline Details */}
        <section className="rounded-xl border bg-card text-card-foreground shadow-xs">
          <div className="flex items-center gap-3 border-b p-5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <GitBranch className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Pipeline Details</h3>
              <p className="text-xs text-muted-foreground">
                Set the core identity and purpose of this sales workflow.
              </p>
            </div>
          </div>

          <div className="space-y-4 p-5">
            <div className="space-y-1.5">
              <Label htmlFor="pipeline-name">Pipeline Name</Label>
              <Input
                id="pipeline-name"
                value={pipelineName}
                onChange={(e) => {
                  setPipelineName(e.target.value)
                  setSavedStatus(null)
                }}
                placeholder="e.g. B2B Enterprise Pipeline"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pipeline-description">Description</Label>
              <textarea
                id="pipeline-description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  setSavedStatus(null)
                }}
                placeholder="Describe the workflow..."
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-hidden focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </section>

        {/* Section 2: Summary Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4 shadow-xs">
            <p className="text-xs font-medium text-muted-foreground">Total Stages</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tabular-nums">{stages.length}</span>
              <span className="text-xs text-muted-foreground">configured</span>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-xs">
            <p className="text-xs font-medium text-muted-foreground">Active Open Stages</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tabular-nums text-primary">
                {openStagesCount}
              </span>
              <span className="text-xs text-muted-foreground">in-progress</span>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-xs">
            <p className="text-xs font-medium text-muted-foreground">Terminal Outcomes</p>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {wonStagesCount} <span className="text-xs font-normal text-muted-foreground">Won</span>
              </span>
              <span className="text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
                {lostStagesCount} <span className="text-xs font-normal text-muted-foreground">Lost</span>
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Deal Stages */}
        <section className="rounded-xl border bg-card text-card-foreground shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
            <div>
              <h3 className="text-sm font-semibold">Deal Stages</h3>
              <p className="text-xs text-muted-foreground">
                Define and order the sequential steps deals follow toward completion.
              </p>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={() => {
                setShowAddStage((prev) => !prev)
                setSavedStatus(null)
              }}
            >
              <Plus className="mr-1.5 size-4" />
              Add Stage
            </Button>
          </div>

          <div className="space-y-4 p-5">
            <div className="space-y-3">
              {stages.map((stage, index) => (
                <div
                  key={stage.id}
                  className="group rounded-xl border bg-background p-4 transition-all hover:border-primary/40 hover:shadow-xs"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Drag / Index handle */}
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <GripVertical className="size-4 shrink-0 text-muted-foreground/60" />
                      <span className="w-5 text-center text-xs font-semibold tabular-nums">
                        {index + 1}
                      </span>
                    </div>

                    {/* Inputs Grid */}
                    <div className="grid flex-1 gap-3 sm:grid-cols-[minmax(0,1fr)_130px_130px]">
                      {/* Stage Name */}
                      <div>
                        <Input
                          value={stage.name}
                          onChange={(e) => updateStage(stage.id, "name", e.target.value)}
                          placeholder="Stage name"
                          className="h-9 font-medium"
                        />
                      </div>

                      {/* Stage Type */}
                      <div>
                        <select
                          value={stage.type}
                          onChange={(e) => {
                            const type = e.target.value as StageType
                            setStages((current) =>
                              current.map((item) =>
                                item.id === stage.id
                                  ? {
                                      ...item,
                                      type,
                                      probability:
                                        type === "won"
                                          ? 100
                                          : type === "lost"
                                            ? 0
                                            : item.probability === 0 || item.probability === 100
                                              ? 20
                                              : item.probability,
                                    }
                                  : item
                              )
                            )
                            setSavedStatus(null)
                          }}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs font-medium shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="open">Open</option>
                          <option value="won">Won</option>
                          <option value="lost">Lost</option>
                        </select>
                      </div>

                      {/* Win Probability */}
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={stage.probability}
                          disabled={stage.type !== "open"}
                          onChange={(e) => {
                            const value = Number(e.target.value)
                            if (e.target.value === "" || (value >= 0 && value <= 100)) {
                              updateStage(
                                stage.id,
                                "probability",
                                e.target.value === "" ? 0 : value
                              )
                            }
                          }}
                          className="h-9 pr-7 text-xs tabular-nums"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                          %
                        </span>
                      </div>
                    </div>

                    {/* Stage Badge & Actions */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          stage.type === "won"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : stage.type === "lost"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              : "bg-primary/10 text-primary"
                        }`}
                      >
                        {stageTypeLabels[stage.type]}
                      </span>

                      <div className="flex items-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-foreground"
                          disabled={
                            index === 0 ||
                            stage.type !== "open" ||
                            stages[index - 1]?.type !== "open"
                          }
                          onClick={() => moveStage(stage.id, "up")}
                        >
                          <ArrowUp className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-foreground"
                          disabled={
                            stage.type !== "open" ||
                            stages[index + 1]?.type !== "open"
                          }
                          onClick={() => moveStage(stage.id, "down")}
                        >
                          <ArrowDown className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeStage(stage.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Stage Form */}
            {showAddStage && (
              <form
                onSubmit={addStage}
                className="space-y-4 rounded-xl border border-dashed bg-muted/20 p-4"
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="size-4 text-primary" />
                  <span>Create New Stage</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="new-stage-name" className="text-xs">
                      Stage Name
                    </Label>
                    <Input
                      id="new-stage-name"
                      value={newStageName}
                      onChange={(e) => setNewStageName(e.target.value)}
                      placeholder="e.g. Contract Sent"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="new-stage-type" className="text-xs">
                      Stage Type
                    </Label>
                    <select
                      id="new-stage-type"
                      value={newStageType}
                      onChange={(e) => setNewStageType(e.target.value as StageType)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="open">Open</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="new-stage-probability" className="text-xs">
                      Win Probability (%)
                    </Label>
                    <Input
                      id="new-stage-probability"
                      type="number"
                      min={0}
                      max={100}
                      value={
                        newStageType === "won"
                          ? "100"
                          : newStageType === "lost"
                            ? "0"
                            : newStageProbability
                      }
                      disabled={newStageType !== "open"}
                      onChange={(e) => setNewStageProbability(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddStage(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm">
                    <CirclePlus className="mr-1.5 size-3.5" />
                    Add Stage
                  </Button>
                </div>
              </form>
            )}

            <div className="flex items-start gap-2.5 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p className="leading-relaxed">
                Win probability auto-calculates forecasted deal values in reporting. Terminal outcomes
                are locked to fixed probabilities: Won (100%) and Lost (0%).
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Visual Flow Preview */}
        <section className="rounded-xl border bg-card text-card-foreground shadow-xs">
          <div className="border-b p-5">
            <h3 className="text-sm font-semibold">Visual Pipeline Preview</h3>
            <p className="text-xs text-muted-foreground">
              Interactive preview of how your stages appear in kanban board columns.
            </p>
          </div>

          <div className="p-5">
            <div className="overflow-x-auto pb-2">
              <div className="flex items-stretch gap-3 min-w-max">
                {stages.map((stage, index) => (
                  <div
                    key={stage.id}
                    className="flex w-40 flex-col justify-between rounded-lg border bg-background p-3 shadow-2xs"
                  >
                    <div className="space-y-2">
                      <div
                        className="h-1.5 w-full rounded-full"
                        style={{
                          backgroundColor:
                            stage.type === "won"
                              ? "#16a34a"
                              : stage.type === "lost"
                                ? "#dc2626"
                                : `hsl(${220 - index * 25} 75% 55%)`,
                        }}
                      />
                      <p className="truncate text-xs font-semibold">
                        {stage.name || "Untitled Stage"}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-medium tabular-nums">{stage.probability}%</span>
                      <span className="capitalize">{stage.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Status Alert */}
        {savedStatus && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{savedStatus}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={handleReset}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleSave}>
            <Check className="mr-1.5 size-4" />
            Save changes
          </Button>
        </div>
      </div>
    </div>
  )
}