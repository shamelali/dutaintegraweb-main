import { useState, useCallback } from "react"
import { Sparkles, Calculator as CalcIcon } from "lucide-react"
import { StepCompany } from "@/components/calculator/step-company"
import { StepFinancials } from "@/components/calculator/step-financials"
import { StepPainPoints } from "@/components/calculator/step-painpoints"
import { ResultsDashboard } from "@/components/calculator/results-dashboard"
import { calculateGrowth } from "@/lib/growth-calculator"
import type { CalculatorInput, CalculatorResult } from "@/lib/calculator-types"

const defaultInput: CalculatorInput = {
  companyName: "",
  industry: "services",
  companyStage: "seed",
  teamSize: 10,
  yearsOperating: 3,
  monthlyRevenue: 0,
  monthlyExpenses: 0,
  currentItSpend: 0,
  painPoints: [],
  targetGrowthPct: 20,
  timeHorizon: 12,
  maxBudget: 0,
}

type WizardStep = "company" | "financials" | "painpoints" | "loading" | "results"

export function CalculatorPage() {
  const [step, setStep] = useState<WizardStep>("company")
  const [input, setInput] = useState<CalculatorInput>({ ...defaultInput })
  const [result, setResult] = useState<CalculatorResult | null>(null)

  const updateInput = useCallback((partial: Partial<CalculatorInput>) => {
    setInput((prev) => ({ ...prev, ...partial }))
  }, [])

  const handleCalculate = useCallback(() => {
    setStep("loading")

    setTimeout(() => {
      const projection = calculateGrowth(input)
      setResult(projection)
      setStep("results")
      window.scrollTo({ top: 0, behavior: "smooth" })
    }, 800)
  }, [input])

  const handleReset = useCallback(() => {
    setStep("company")
    setInput({ ...defaultInput })
    setResult(null)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const progressSteps: WizardStep[] = ["company", "financials", "painpoints"]
  const currentStepIndex = progressSteps.indexOf(step as WizardStep)

  return (
    <div className="min-h-screen">
      {/* Hero */}
      {step !== "results" && step !== "loading" && (
        <section className="py-16 md:py-20 px-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-navy via-slate-deep to-navy -z-10" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-electric/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 -z-10" />
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 text-electric text-xs font-semibold uppercase tracking-widest mb-4">
              <CalcIcon className="w-4 h-4" />
              Growth Allocation Calculator
            </div>
            <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">
              How Much Should You{" "}
              <span className="text-electric">Invest</span>{" "}
              to Grow?
            </h1>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              Get a personalised growth plan showing exactly how DI services
              impact your bottom line — with real numbers, not guesses.
            </p>
          </div>
        </section>
      )}

      {/* Loading */}
      {step === "loading" && (
        <section className="py-32 px-6 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-electric/10 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-electric animate-pulse" />
            </div>
            <h2 className="text-2xl font-heading font-bold mb-3">
              Generating Your Growth Plan...
            </h2>
            <p className="text-muted-foreground text-sm mb-8">
              Analysing {input.companyName}'s financials and building your custom roadmap
            </p>
            <div className="w-full max-w-xs mx-auto h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-electric rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]" style={{ width: "60%" }} />
            </div>
          </div>
        </section>
      )}

      {/* Wizard / Results */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          {/* Progress bar */}
          {step !== "results" && step !== "loading" && (
            <div className="flex items-center gap-2 mb-8">
              {progressSteps.map((s, i) => (
                <div
                  key={s}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i <= currentStepIndex ? "bg-electric" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Steps */}
          {step === "company" && (
            <StepCompany data={input} onUpdate={updateInput} onNext={() => setStep("financials")} />
          )}
          {step === "financials" && (
            <StepFinancials
              data={input}
              onUpdate={updateInput}
              onNext={() => setStep("painpoints")}
              onBack={() => setStep("company")}
            />
          )}
          {step === "painpoints" && (
            <StepPainPoints
              data={input}
              onUpdate={updateInput}
              onNext={handleCalculate}
              onBack={() => setStep("financials")}
            />
          )}
          {step === "results" && result && (
            <ResultsDashboard result={result} onReset={handleReset} />
          )}
        </div>
      </section>
    </div>
  )
}
