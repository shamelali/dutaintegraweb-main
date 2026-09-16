import { useState } from "react"
import { Link } from "react-router-dom"
import {
  RotateCcw,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Shield,
  TrendingUp,
  Clock,
  DollarSign,
  Users,
  Zap,
  Flame,
  Timer,
  Rocket,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GrowthMetrics } from "./growth-metrics"
import { ProjectionChart } from "./projection-chart"
import { ServiceCard } from "./service-card"
import type { CalculatorResult } from "@/lib/calculator-types"
import { formatRM, formatRMBig } from "@/lib/growth-calculator"
import { useLanguage } from "@/hooks/use-language"

interface ResultsDashboardProps {
  result: CalculatorResult
  onReset: () => void
}

export function ResultsDashboard({ result, onReset }: ResultsDashboardProps) {
  const { lang } = useLanguage()
  const isEn = lang === "en"
  const [showTable, setShowTable] = useState(false)
  const [showBudget, setShowBudget] = useState(false)

  const diScenario = result.scenarios.find((s) => s.id === "di")!
  const hireScenario = result.scenarios.find((s) => s.id === "hire")!

  const diVsHireSaving = hireScenario.monthlyCostRM - diScenario.monthlyCostRM
  const diCoverage = diScenario.coveragePct
  const hireCoverage = hireScenario.coveragePct

  const waMessage = encodeURIComponent(
    `Hi Duta Integra! I completed the Growth Allocation Calculator.\n\n` +
      `Company: ${result.input.companyName}\n` +
      `Monthly Revenue: RM ${result.input.monthlyRevenue.toLocaleString()}\n` +
      `Pain points: ${result.costOfInaction.painImpacts.map((p) => p.label).join(", ")}\n` +
      `Annual cost of inaction: ${formatRMBig(result.costOfInaction.totalAnnualCostRM)}\n` +
      `Recommended: ${result.recommendedTier.name} + ${result.recommendedAddOns.map((a) => a.name).join(", ")}\n` +
      `Projected ${result.input.timeHorizon}-month revenue growth: +${result.projectedRevenueGrowth}%\n` +
      `Net benefit vs doing nothing: ${formatRM(result.netBenefit)}\n\n` +
      `I'd like to discuss next steps.`
  )

  return (
    <div className="space-y-8">
      {/* ── Story Opening: The Verdict ──────────────────────────── */}
      <Card className="p-6 md:p-8 text-center">
        <Badge variant="electric" className="mb-3">Growth Plan Ready</Badge>
        <h1 className="text-3xl md:text-4xl font-heading font-bold mb-2">
          {isEn ? "Here's What We Found" : "Ini Yang Kami Temui"}
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          {isEn
            ? `${result.input.companyName}, here's your honest assessment — and the path forward.`
            : `${result.input.companyName}, ini penilaian jujur anda — dan jalan ke hadapan.`}
        </p>
      </Card>

      {/* ── Chapter 1: What's Broken ────────────────────────────── */}
      <Card className="p-6 md:p-8 border-amber-500/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-heading font-bold">
              {isEn ? "Chapter 1: The Real Cost of Inaction" : "Bab 1: Kos Sebenar Tindakan"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isEn
                ? "What these pain points are really costing you"
                : "Apa yang titik kesakitan ini sebenarnya memakan anda"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {result.costOfInaction.painImpacts.map((pain) => (
            <div
              key={pain.painPoint}
              className="p-4 rounded-xl bg-background/50 border border-border"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{pain.emoji}</span>
                  <span className="text-sm font-semibold">{pain.label}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Annual cost</div>
                  <div className="text-sm font-bold text-amber-400">
                    {formatRMBig(pain.annualCostRM)}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{pain.description}</p>
              <div className="flex gap-4 text-xs">
                <span className="text-muted-foreground">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {pain.hoursPerWeek} hrs/week lost
                </span>
                <span className="text-muted-foreground">
                  Severity: {"●".repeat(pain.severity)}{"○".repeat(5 - pain.severity)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Annual losses</div>
              <div className="text-2xl font-bold text-amber-400">
                {formatRMBig(result.costOfInaction.totalAnnualCostRM)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Hours lost per week</div>
              <div className="text-2xl font-bold text-amber-400">
                {result.costOfInaction.totalHoursPerWeek} hrs
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                {result.input.timeHorizon}-month compounded loss
              </div>
              <div className="text-2xl font-bold text-red-400">
                {formatRMBig(
                  result.input.timeHorizon === 12
                    ? result.costOfInaction.projectedLoss12M
                    : result.input.timeHorizon === 24
                    ? result.costOfInaction.projectedLoss24M
                    : result.costOfInaction.projectedLoss36M
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Startup Impact Card (early-stage only) ─────────────────── */}
      {(result.input.companyStage === "pre_seed" || result.input.companyStage === "seed") && (
        <Card className="p-6 md:p-8 border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-heading font-bold">
                {isEn ? "Your Startup Survival Impact" : "Kesan Kemandirian Pemula Anda"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isEn
                  ? "How DI affects your runway and founder bandwidth"
                  : "Bagaimana DI mempengaruhi laluan dan lebar jalur pengasas anda"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-background border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Timer className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium">{isEn ? "Founder Hours Recovered" : "Masa Pengasas Dipulihkan"}</span>
              </div>
              <div className="text-3xl font-bold text-amber-400">{result.founderHoursRecovered} hrs/wk</div>
              <p className="text-xs text-muted-foreground mt-1">
                {isEn
                  ? `That's ${(result.founderHoursRecovered * 4.33).toFixed(0)} hrs/month back in your day`
                  : `Itu ${(result.founderHoursRecovered * 4.33).toFixed(0)} jam/bulan kembali ke hari anda`}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-background border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-medium">{isEn ? "Burn Rate Impact" : "Kesan Kadar Pembakaran"}</span>
              </div>
              <div className="text-3xl font-bold text-orange-400">
                {result.costOfInaction.burnRateImpact > 0 ? "-" : "+"}
                {formatRM(result.costOfInaction.burnRateImpact)}/mo
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isEn
                  ? `Pain costs you ${((result.costOfInaction.burnRateImpact / (result.input.monthlyExpenses || 1)) * 100).toFixed(1)}% of expenses`
                  : `Kesakitan membebani anda ${((result.costOfInaction.burnRateImpact / (result.input.monthlyExpenses || 1)) * 100).toFixed(1)}% perbelanjaan`}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-background border border-border">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium">{isEn ? "Runway Extension" : "Pemanjangan Laluan"}</span>
              </div>
              <div className="text-3xl font-bold text-green-400">
                {result.runwayExtensionMonths > 0 ? `+${result.runwayExtensionMonths}` : "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isEn
                  ? "Additional months of runway from cost savings"
                  : "Bulan tambahan laluan daripada penjimatan kos"}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── Chapter 2: What DI Fixes ────────────────────────────── */}
      <Card className="p-6 md:p-8 border-electric/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-electric/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-electric" />
          </div>
          <div>
            <h2 className="text-xl font-heading font-bold">
              {isEn ? "Chapter 2: How DI Fixes Each Problem" : "Bab 2: Bagaimana DI Memperbaiki Setiap Masalah"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isEn
                ? "Every pain point maps to a specific DI solution with quantified impact"
                : "Setiap titik kesakitan dipadankan dengan penyelesaian DI khusus dengan kesan yang dikuantifikasi"}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {result.costOfInaction.painImpacts.map((pain) => {
            const relevantImpacts = [
              ...result.recommendedTier.serviceImpacts,
              ...result.recommendedAddOns.flatMap((a) => a.serviceImpacts),
            ].filter((imp) => imp.painPoint === pain.painPoint)

            const totalMonthlySaving = relevantImpacts.reduce((s, imp) => s + imp.monthlySavingRM, 0)
            const totalHoursSaved = relevantImpacts.reduce((s, imp) => s + imp.hoursSavedPerWeek, 0)

            return (
              <div
                key={pain.painPoint}
                className="p-4 rounded-xl bg-background/50 border border-border"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5" />
                    <div>
                      <span className="text-sm font-semibold">{pain.emoji} {pain.label}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{pain.diSolution}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className="text-sm font-bold text-green-400">
                      +{formatRM(totalMonthlySaving)}/mo
                    </div>
                    <div className="text-xs text-blue-400">
                      {totalHoursSaved} hrs/week recovered
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* ── Chapter 3: The Comparison ────────────────────────────── */}
      <Card className="p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-heading font-bold">
              {isEn ? "Chapter 3: DI vs The Alternatives" : "Bab 3: DI vs Alternatif"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isEn
                ? "Three paths. Let's see which one wins."
                : "Tiga jalan. Mari kita lihat mana yang menang."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {result.scenarios.map((scenario) => {
            const isDI = scenario.id === "di"
            return (
              <div
                key={scenario.id}
                className={`p-5 rounded-xl border transition-all ${
                  isDI
                    ? "border-electric bg-electric/5 shadow-lg shadow-electric/10"
                    : "border-border bg-card"
                }`}
              >
                {isDI && (
                  <div className="text-xs font-bold text-electric uppercase tracking-wider mb-2">
                    ★ Recommended
                  </div>
                )}
                <div className="text-2xl mb-2">{scenario.emoji}</div>
                <h3 className="font-heading font-bold text-lg mb-1">{scenario.label}</h3>
                <p className="text-xs text-muted-foreground mb-4">{scenario.description}</p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Monthly cost
                    </span>
                    <span className={`font-semibold ${isDI ? "text-electric" : ""}`}>
                      {scenario.monthlyCostRM > 0 ? formatRM(scenario.monthlyCostRM) + "/mo" : "RM 0"}
                    </span>
                  </div>

                  {scenario.oneOffCostRM > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">One-time setup</span>
                      <span className="font-semibold">{formatRM(scenario.oneOffCostRM)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" /> Coverage
                    </span>
                    <span className={`font-semibold ${isDI ? "text-electric" : ""}`}>
                      {scenario.coveragePct}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Hours recovered/week
                    </span>
                    <span className={`font-semibold ${isDI ? "text-electric" : ""}`}>
                      {scenario.hoursRecovered} hrs
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Risk level
                    </span>
                    <span className={`font-semibold ${
                      scenario.risk <= 2 ? "text-green-400" :
                      scenario.risk <= 3 ? "text-amber-400" : "text-red-400"
                    }`}>
                      {"●".repeat(scenario.risk)}{"○".repeat(5 - scenario.risk)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* DI vs Hire callout */}
        <div className="mt-4 p-4 rounded-xl bg-electric/5 border border-electric/10 text-center">
          <p className="text-sm text-muted-foreground">
            {isEn ? "DI vs Hiring:" : "DI vs Mengupah:"}{" "}
            <span className="text-electric font-semibold">
              DI costs {formatRM(diVsHireSaving)}/mo less
            </span>{" "}
            {isEn ? "while covering" : "sambil meliputi"}{" "}
            <span className="text-electric font-semibold">{diCoverage - hireCoverage}% more</span>{" "}
            {isEn ? "of your pain points." : "titik kesakitan anda."}
          </p>
        </div>
      </Card>

      {/* ── KPI Cards ──────────────────────────────────────────── */}
      <GrowthMetrics result={result} />

      {/* ── Chart ──────────────────────────────────────────────── */}
      <ProjectionChart
        projections={result.monthlyProjections}
        companyName={result.input.companyName}
      />

      {/* ── Investment Summary ─────────────────────────────────── */}
      <Card className="p-6 md:p-8">
        <h2 className="text-xl font-heading font-bold mb-4">
          {isEn ? "The Bottom Line" : "Ringkasan"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 rounded-xl bg-muted/30">
            <div className="text-sm text-muted-foreground mb-1">
              {isEn ? "Total DI Investment" : "Pelaburan DI Jumlah"}
            </div>
            <div className="text-2xl font-bold text-foreground">{formatRMBig(result.totalInvestment)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {isEn ? "Over" : "Dalam"} {result.input.timeHorizon} {isEn ? "months" : "bulan"}
            </div>
          </div>
          <div className="text-center p-4 rounded-xl bg-green-500/5 border border-green-500/10">
            <div className="text-sm text-muted-foreground mb-1">
              {isEn ? "Projected Savings" : "Jimatan Diramal"}
            </div>
            <div className="text-2xl font-bold text-green-400">{formatRMBig(result.totalSavings)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {isEn ? "From recovered hours + efficiency" : "Dari jam dipulihkan + kecekapan"}
            </div>
          </div>
          <div className="text-center p-4 rounded-xl bg-electric/5 border border-electric/10">
            <div className="text-sm text-muted-foreground mb-1">
              {isEn ? "Net Benefit vs Doing Nothing" : "Manfaat Bersih vs Tindakan"}
            </div>
            <div className="text-2xl font-bold text-electric">{formatRMBig(result.netBenefit)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {isEn ? "Additional profit over the period" : "Keuntungan tambahan sepanjang tempoh"}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Recommended Package ────────────────────────────────── */}
      <Card className="p-6 md:p-8">
        <h2 className="text-xl font-heading font-bold mb-2">
          {isEn ? "Your Recommended Package" : "Pakej Yang Disyorkan"}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {isEn
            ? "Built specifically for your pain profile and budget."
            : "Dibina khusus untuk profil kesakitan dan belanjawan anda."}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ServiceCard
            service={result.recommendedTier}
            isRecommended={true}
            matchCount={result.recommendedTier.matchesPainPoint.filter((p) =>
              result.input.painPoints.includes(p)
            ).length}
          />
          {result.recommendedAddOns.map((addon) => (
            <ServiceCard
              key={addon.id}
              service={addon}
              isRecommended={false}
              matchCount={addon.matchesPainPoint.filter((p) =>
                result.input.painPoints.includes(p)
              ).length}
            />
          ))}
        </div>
      </Card>

      {/* ── Budget Fit ─────────────────────────────────────────── */}
      <Card className="p-6 md:p-8">
        <button
          onClick={() => setShowBudget(!showBudget)}
          className="flex items-center justify-between w-full"
        >
          <h2 className="text-xl font-heading font-bold">
            {isEn ? "Budget Fit Check" : "Semakan Kesesuaian Belanjawan"}
          </h2>
          {showBudget ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {showBudget && (
          <div className="mt-6 space-y-4">
            <div className="p-4 rounded-xl bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">DI monthly cost</span>
                <span className="font-semibold">{formatRM(result.recommendedTier.monthlyCost + result.recommendedAddOns.reduce((a, s) => a + s.monthlyCost, 0))}/mo</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">% of your revenue</span>
                <span className={`font-semibold ${
                  ((result.recommendedTier.monthlyCost + result.recommendedAddOns.reduce((a, s) => a + s.monthlyCost, 0)) / result.input.monthlyRevenue * 100) <= result.idealBudgetPct
                    ? "text-green-400" : "text-amber-400"
                }`}>
                  {((result.recommendedTier.monthlyCost + result.recommendedAddOns.reduce((a, s) => a + s.monthlyCost, 0)) / result.input.monthlyRevenue * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ideal range for your size</span>
                <span className="text-sm text-electric font-medium">{result.idealBudgetPct}% of revenue</span>
              </div>
            </div>

            {((result.recommendedTier.monthlyCost + result.recommendedAddOns.reduce((a, s) => a + s.monthlyCost, 0)) / result.input.monthlyRevenue * 100) <= result.idealBudgetPct ? (
              <p className="text-sm text-green-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {isEn
                  ? "This plan fits comfortably within healthy investment range."
                  : "Pelan ini sesuai dalam julat pelaburan yang sihat."}
              </p>
            ) : (
              <p className="text-sm text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {isEn
                  ? "Slightly above ideal range — but the ROI justifies it."
                  : "Sedikit di atas julat ideal — tetapi ROI mengatasinya."}
              </p>
            )}
          </div>
        )}
      </Card>

      {/* ── Month-by-Month Breakdown ────────────────────────────── */}
      <Card className="p-6 md:p-8">
        <button
          onClick={() => setShowTable(!showTable)}
          className="flex items-center justify-between w-full"
        >
          <h2 className="text-xl font-heading font-bold">
            {isEn ? "Month-by-Month Breakdown" : "Pecahan Bulan demi Bulan"}
          </h2>
          {showTable ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {showTable && (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground font-medium">Month</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Revenue (DI)</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Revenue (Nothing)</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">DI Cost</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Savings</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">DI Profit</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Cumulative ROI</th>
                </tr>
              </thead>
              <tbody>
                {result.monthlyProjections.map((p) => (
                  <tr key={p.month} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="py-2 font-medium">Mo {p.month}</td>
                    <td className="py-2 text-right text-electric">{formatRM(p.diRevenue)}</td>
                    <td className="py-2 text-right text-muted-foreground">{formatRM(p.nothingRevenue)}</td>
                    <td className="py-2 text-right text-amber-400">{formatRM(p.diCost)}</td>
                    <td className="py-2 text-right text-green-400">{formatRM(p.savings)}</td>
                    <td className="py-2 text-right font-medium text-green-400">
                      {formatRM(p.diProfit)}
                    </td>
                    <td className={`py-2 text-right font-medium ${p.cumulativeROI >= 0 ? "text-electric" : "text-red-400"}`}>
                      {p.cumulativeROI >= 0 ? "+" : ""}{p.cumulativeROI}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── CTAs ────────────────────────────────────────────────── */}
      <Card className="p-6 md:p-8 text-center">
        <h2 className="text-xl font-heading font-bold mb-2">
          {isEn ? "Ready to Stop Losing Money?" : "Bersedia untuk Berhenti Kerugian?"}
        </h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          {isEn
            ? `Every month you wait costs you ~${formatRM(result.costOfInaction.totalAnnualCostRM / 12)}. Book a free 30-minute consultation — we'll review your plan and get you started.`
            : `Setiap bulan anda tunggu memakan anda ~${formatRM(result.costOfInaction.totalAnnualCostRM / 12)}. Tempah konsultasi percuma 30 minit — kami akan menyemak pelan anda dan membantu anda bermula.`}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={`https://wa.me/601154034051?text=${waMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            {isEn ? "Chat on WhatsApp" : "Bual di WhatsApp"}
          </a>
          <Link
            to="/contact"
            className="inline-flex items-center justify-center h-11 rounded-md px-8 border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium transition-colors"
          >
            {isEn ? "Book Free Consultation" : "Tempah Konsultasi Percuma"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Button variant="ghost" size="lg" onClick={onReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            {isEn ? "Recalculate" : "Kira Semula"}
          </Button>
        </div>
      </Card>
    </div>
  )
}
