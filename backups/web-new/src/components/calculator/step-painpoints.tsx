import { useState } from "react"
import { ArrowRight, ArrowLeft, AlertTriangle, Clock, DollarSign, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { CalculatorInput, PainPoint, TimeHorizon } from "@/lib/calculator-types"
import { PAIN_IMPACTS, calculateCostOfInaction, formatRMBig } from "@/lib/growth-calculator"

interface StepPainPointsProps {
  data: CalculatorInput
  onUpdate: (partial: Partial<CalculatorInput>) => void
  onNext: () => void
  onBack: () => void
}

const painPointList: { value: PainPoint; label: string; emoji: string; desc: string }[] = [
  { value: "compliance", label: "PDPA / Compliance", emoji: "📋", desc: "Regulatory deadlines and audit trails" },
  { value: "reporting", label: "Manual Reporting", emoji: "📊", desc: "Time spent on reports and dashboards" },
  { value: "ticketing", label: "IT Support / Ticketing", emoji: "🎫", desc: "Slow response and unresolved issues" },
  { value: "backup", label: "Backup & Disaster Recovery", emoji: "💾", desc: "Data protection and recovery worries" },
  { value: "security", label: "Cybersecurity Gaps", emoji: "🔒", desc: "Unprotected endpoints and phishing risks" },
  { value: "onboarding", label: "Staff Onboarding", emoji: "👥", desc: "Slow setup for new employees" },
  { value: "ai_automation", label: "AI / Process Automation", emoji: "🤖", desc: "Repetitive tasks eating up team time" },
  { value: "cloud_migration", label: "Cloud Migration", emoji: "☁️", desc: "Moving from on-prem to cloud" },
]

const horizons: { value: TimeHorizon; label: string; desc: string }[] = [
  { value: 12, label: "12 months", desc: "Quick wins" },
  { value: 24, label: "24 months", desc: "Steady growth" },
  { value: 36, label: "36 months", desc: "Transformation" },
]

export function StepPainPoints({ data, onUpdate, onNext, onBack }: StepPainPointsProps) {
  const [showDetails, setShowDetails] = useState<PainPoint | null>(null)
  const [showGrowth, setShowGrowth] = useState(false)

  const togglePainPoint = (pp: PainPoint) => {
    const current = data.painPoints
    const updated = current.includes(pp)
      ? current.filter((p) => p !== pp)
      : [...current, pp]
    onUpdate({ painPoints: updated })
  }

  // Live cost of inaction calculation
  const costOfInaction = data.painPoints.length > 0
    ? calculateCostOfInaction(data.painPoints, data.companyStage)
    : null

  const projectedLoss = data.timeHorizon === 12
    ? costOfInaction?.projectedLoss12M
    : data.timeHorizon === 24
    ? costOfInaction?.projectedLoss24M
    : costOfInaction?.projectedLoss36M

  const isValid = data.painPoints.length > 0 && data.timeHorizon > 0

  return (
    <Card className="p-8 md:p-10">
      <Badge variant="outline" className="mb-4">Step 3 of 3</Badge>
      <h2 className="text-2xl md:text-3xl font-heading font-bold mb-2">
        What's holding your business back?
      </h2>
      <p className="text-muted-foreground mb-8">
        Select every pain point you're dealing with. We'll show you exactly what it's costing you.
      </p>

      <div className="space-y-8">
        {/* Pain Point Selection */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {painPointList.map((pp) => {
              const isSelected = data.painPoints.includes(pp.value)
              const impact = PAIN_IMPACTS[pp.value]
              const isExpanded = showDetails === pp.value

              return (
                <div key={pp.value} className="relative">
                  <button
                    onClick={() => togglePainPoint(pp.value)}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-electric bg-electric/10"
                        : "border-border hover:border-electric/50 hover:bg-accent"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{pp.emoji}</span>
                        <div>
                          <div className={`text-sm font-semibold ${isSelected ? "text-electric" : ""}`}>
                            {pp.label}
                          </div>
                          <div className="text-xs text-muted-foreground">{pp.desc}</div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="text-right">
                          <div className="text-xs text-electric font-medium">Costs you</div>
                          <div className="text-sm font-bold text-electric">
                            RM {(impact.annualCostRM / 1000).toFixed(0)}K/yr
                          </div>
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Expandable detail */}
                  {isSelected && (
                    <div className="mt-2 px-4">
                      <button
                        onClick={() => setShowDetails(isExpanded ? null : pp.value)}
                        className="flex items-center gap-1 text-xs text-electric hover:underline"
                      >
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {isExpanded ? "Hide details" : "How DI fixes this"}
                      </button>
                      {isExpanded && (
                        <div className="mt-2 p-3 rounded-lg bg-electric/5 border border-electric/10 text-sm">
                          <p className="text-muted-foreground mb-2">{impact.diSolution}</p>
                          <div className="flex gap-4 text-xs">
                            <span className="text-green-400">
                              Saves ~RM {Math.round(impact.annualCostRM * impact.recoveryRate / 12).toLocaleString()}/mo
                            </span>
                            <span className="text-blue-400">
                              Recovers ~{Math.round(impact.hoursPerWeek * impact.recoveryRate)} hrs/week
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Live Cost of Inaction Card */}
        {costOfInaction && (
          <div className="rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-heading font-bold text-lg">
              <AlertTriangle className="w-5 h-5" />
              The Cost of Doing Nothing
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-background/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <DollarSign className="w-3 h-3" />
                  Annual losses
                </div>
                <div className="text-2xl font-bold text-amber-400">
                  {formatRMBig(costOfInaction.totalAnnualCostRM)}
                </div>
                <div className="text-xs text-muted-foreground/60 mt-1">from these pain points alone</div>
              </div>

              <div className="p-4 rounded-xl bg-background/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Clock className="w-3 h-3" />
                  Hours lost weekly
                </div>
                <div className="text-2xl font-bold text-amber-400">
                  {costOfInaction.totalHoursPerWeek} hrs
                </div>
                <div className="text-xs text-muted-foreground/60 mt-1">
                  = {Math.round(costOfInaction.totalHoursPerWeek * 52)} hrs/year
                </div>
              </div>

              <div className="p-4 rounded-xl bg-background/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <AlertTriangle className="w-3 h-3" />
                  {data.timeHorizon}-month compounded loss
                </div>
                <div className="text-2xl font-bold text-red-400">
                  {projectedLoss ? formatRMBig(projectedLoss) : "—"}
                </div>
                <div className="text-xs text-muted-foreground/60 mt-1">costs compound as competitors pull ahead</div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              These are conservative estimates based on Malaysian SME benchmarks.
              Actual costs are often higher when you factor in lost opportunities and staff burnout.
            </p>
          </div>
        )}

        {/* Growth Target */}
        <div>
          <button
            onClick={() => setShowGrowth(!showGrowth)}
            className="flex items-center gap-2 text-sm font-medium text-electric hover:underline"
          >
            {showGrowth ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Optional: Set a growth target
          </button>
          {showGrowth && (
            <div className="mt-3">
              <label className="block text-xs text-muted-foreground mb-2">Revenue growth target over the period</label>
              <div className="flex flex-wrap gap-2">
                {[10, 20, 30, 50, 75].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => onUpdate({ targetGrowthPct: pct })}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                      data.targetGrowthPct === pct
                        ? "border-electric bg-electric/10 text-electric"
                        : "border-border hover:border-electric/50"
                    }`}
                  >
                    +{pct}%
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Time Horizon */}
        <div>
          <label className="block text-sm font-medium mb-3">Planning horizon</label>
          <div className="grid grid-cols-3 gap-2">
            {horizons.map((h) => (
              <button
                key={h.value}
                onClick={() => onUpdate({ timeHorizon: h.value })}
                className={`p-4 rounded-xl border text-center transition-all ${
                  data.timeHorizon === h.value
                    ? "border-electric bg-electric/10"
                    : "border-border hover:border-electric/50 hover:bg-accent"
                }`}
              >
                <div className={`text-sm font-semibold ${data.timeHorizon === h.value ? "text-electric" : ""}`}>
                  {h.label}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{h.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="outline" size="lg" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button variant="electric" size="lg" onClick={onNext} disabled={!isValid}>
          {data.painPoints.length > 0
            ? `See What DI Can Fix (${data.painPoints.length} pain point${data.painPoints.length !== 1 ? "s" : ""})`
            : "Select at least one pain point"}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </Card>
  )
}
