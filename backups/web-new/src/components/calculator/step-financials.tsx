import { useState } from "react"
import { ArrowRight, ArrowLeft, DollarSign, TrendingUp, TrendingDown, Server } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { CalculatorInput } from "@/lib/calculator-types"

interface StepFinancialsProps {
  data: CalculatorInput
  onUpdate: (partial: Partial<CalculatorInput>) => void
  onNext: () => void
  onBack: () => void
}

function RMInput({
  label,
  value,
  onChange,
  placeholder,
  icon: Icon,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  placeholder: string
  icon: React.ElementType
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2 flex items-center gap-2">
        <Icon className="w-4 h-4 text-electric" />
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">
          RM
        </span>
        <input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          placeholder={placeholder}
          min={0}
          step={500}
          className="w-full pl-12 pr-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-electric"
        />
      </div>
    </div>
  )
}

export function StepFinancials({ data, onUpdate, onNext, onBack }: StepFinancialsProps) {
  const [useAutoMargin, setUseAutoMargin] = useState(data.monthlyExpenses === 0)

  const profitMargin =
    data.monthlyRevenue > 0
      ? Math.round(((data.monthlyRevenue - data.monthlyExpenses) / data.monthlyRevenue) * 100)
      : 0

  const handleRevenueChange = (revenue: number) => {
    onUpdate({ monthlyRevenue: revenue })
    if (useAutoMargin && revenue > 0) {
      // Auto-calculate expenses at 70% of revenue (30% margin)
      onUpdate({ monthlyRevenue: revenue, monthlyExpenses: Math.round(revenue * 0.7) })
    }
  }

  const handleAutoMarginToggle = () => {
    if (!useAutoMargin && data.monthlyRevenue > 0) {
      // Switch to auto: set expenses at 70%
      setUseAutoMargin(true)
      onUpdate({ monthlyExpenses: Math.round(data.monthlyRevenue * 0.7) })
    } else {
      setUseAutoMargin(false)
    }
  }

  const isValid = data.monthlyRevenue > 0

  return (
    <Card className="p-8 md:p-10">
      <Badge variant="outline" className="mb-4">Step 2 of 3</Badge>
      <h2 className="text-2xl md:text-3xl font-heading font-bold mb-2">
        Your financial picture
      </h2>
      <p className="text-muted-foreground mb-8">
        This stays private and never leaves your browser.
      </p>

      <div className="space-y-6">
        <RMInput
          label="Monthly Revenue"
          value={data.monthlyRevenue}
          onChange={handleRevenueChange}
          placeholder="e.g. 80000"
          icon={TrendingUp}
        />

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-electric" />
              Monthly Expenses
            </label>
            <button
              type="button"
              onClick={handleAutoMarginToggle}
              className="text-xs text-electric hover:underline"
            >
              {useAutoMargin ? "Enter manually" : "Auto-calculate (30% margin)"}
            </button>
          </div>
          {!useAutoMargin ? (
            <RMInput
              label=""
              value={data.monthlyExpenses}
              onChange={(v) => onUpdate({ monthlyExpenses: v })}
              placeholder="e.g. 55000"
              icon={DollarSign}
            />
          ) : (
            <div className="p-4 rounded-lg bg-electric/5 border border-electric/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estimated expenses (30% margin)</span>
                <span className="font-semibold text-electric">
                  RM {data.monthlyExpenses.toLocaleString()}/mo
                </span>
              </div>
            </div>
          )}
          {data.monthlyRevenue > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Profit margin: <span className={profitMargin >= 20 ? "text-green-400" : "text-amber-400"}>{profitMargin}%</span>
              {profitMargin < 10 && " — we'll factor in tighter margins"}
              {profitMargin >= 40 && " — strong margins, nice"}
            </p>
          )}
        </div>

        <RMInput
          label="Current Monthly IT Spend"
          value={data.currentItSpend}
          onChange={(v) => onUpdate({ currentItSpend: v })}
          placeholder="e.g. 3000"
          icon={Server}
        />
        <p className="text-xs text-muted-foreground -mt-4">
          Include hardware, software, support, cloud, and any IT staff costs.
        </p>
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="outline" size="lg" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button variant="electric" size="lg" onClick={onNext} disabled={!isValid}>
          Next: Priorities
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </Card>
  )
}
