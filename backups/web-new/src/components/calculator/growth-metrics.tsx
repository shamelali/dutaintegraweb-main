import { TrendingUp, Wallet, Clock, Percent, ArrowUpRight, ArrowDownRight } from "lucide-react"
import type { CalculatorResult } from "@/lib/calculator-types"
import { formatRM, formatPct } from "@/lib/growth-calculator"

interface GrowthMetricsProps {
  result: CalculatorResult
}

interface MetricCard {
  label: string
  value: string
  subtext: string
  icon: React.ElementType
  positive: boolean
}

export function GrowthMetrics({ result }: GrowthMetricsProps) {
  const metrics: MetricCard[] = [
    {
      label: "Revenue Growth (vs doing nothing)",
      value: formatPct(result.projectedRevenueGrowth),
      subtext: `${result.input.timeHorizon}-month projection with DI`,
      icon: TrendingUp,
      positive: result.projectedRevenueGrowth > 0,
    },
    {
      label: "Net Benefit vs Inaction",
      value: formatRM(result.netBenefit),
      subtext: "Additional profit over the period",
      icon: Wallet,
      positive: result.netBenefit > 0,
    },
    {
      label: "Break-Even Point",
      value: result.breakEvenMonth <= result.input.timeHorizon ? `Month ${result.breakEvenMonth}` : "Beyond horizon",
      subtext: result.breakEvenMonth <= result.input.timeHorizon
        ? "DI investment pays for itself"
        : "Consider adjusting scope",
      icon: Clock,
      positive: result.breakEvenMonth <= result.input.timeHorizon,
    },
    {
      label: "Year 1 ROI",
      value: formatPct(result.yearOneROI),
      subtext: "Return on DI investment",
      icon: Percent,
      positive: result.yearOneROI > 0,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="rounded-xl border border-border bg-card p-4 md:p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <m.icon className="w-5 h-5 text-electric" />
            {m.positive ? (
              <ArrowUpRight className="w-4 h-4 text-green-400" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-red-400" />
            )}
          </div>
          <div className={`text-xl md:text-2xl font-bold ${m.positive ? "text-green-400" : "text-amber-400"}`}>
            {m.value}
          </div>
          <div className="text-xs text-muted-foreground mt-1 font-medium">{m.label}</div>
          <div className="text-xs text-muted-foreground/60 mt-0.5">{m.subtext}</div>
        </div>
      ))}
    </div>
  )
}
