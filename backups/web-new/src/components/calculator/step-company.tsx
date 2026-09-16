import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { CalculatorInput, Industry, CompanyStage } from "@/lib/calculator-types"

interface StepCompanyProps {
  data: CalculatorInput
  onUpdate: (partial: Partial<CalculatorInput>) => void
  onNext: () => void
}

const industries: { value: Industry; label: string; emoji: string }[] = [
  { value: "services", label: "Professional Services", emoji: "💼" },
  { value: "retail", label: "Retail & E-Commerce", emoji: "🛒" },
  { value: "manufacturing", label: "Manufacturing", emoji: "🏭" },
  { value: "technology", label: "Technology & SaaS", emoji: "💻" },
  { value: "healthcare", label: "Healthcare", emoji: "🏥" },
  { value: "education", label: "Education", emoji: "📚" },
  { value: "finance", label: "Finance & Accounting", emoji: "💰" },
  { value: "logistics", label: "Logistics & Supply Chain", emoji: "🚚" },
  { value: "other", label: "Other", emoji: "📌" },
]

const stages: { value: CompanyStage; label: string; desc: string; emoji: string }[] = [
  { value: "pre_seed", label: "Pre-Seed / Pre-Revenue", desc: "Still building or just launched", emoji: "🌱" },
  { value: "seed", label: "Seed / Early Revenue", desc: "Under RM 50K/month", emoji: "🌿" },
  { value: "growth", label: "Growth Stage", desc: "RM 50K–200K/month", emoji: "🌳" },
  { value: "established", label: "Established", desc: "RM 200K+/month", emoji: "🏢" },
]

const teamSizes = [
  { value: [1, 5], label: "1–5" },
  { value: [6, 15], label: "6–15" },
  { value: [16, 30], label: "16–30" },
  { value: [31, 100], label: "31–100" },
  { value: [101, 500], label: "100+" },
]

export function StepCompany({ data, onUpdate, onNext }: StepCompanyProps) {
  const isValid = data.companyName.trim().length > 0 && data.teamSize > 0

  const getTeamSizeLabel = () => {
    if (data.teamSize <= 5) return "1–5"
    if (data.teamSize <= 15) return "6–15"
    if (data.teamSize <= 30) return "16–30"
    if (data.teamSize <= 100) return "31–100"
    return "100+"
  }

  const handleTeamSizeSelect = (range: number[]) => {
    const mid = Math.round((range[0] + range[range.length - 1]) / 2)
    onUpdate({ teamSize: mid })
  }

  return (
    <Card className="p-8 md:p-10">
      <Badge variant="outline" className="mb-4">Step 1 of 3</Badge>
      <h2 className="text-2xl md:text-3xl font-heading font-bold mb-2">
        Tell us about your company
      </h2>
      <p className="text-muted-foreground mb-8">
        We'll tailor the projection to your stage, industry, and team size.
      </p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Company Name</label>
          <input
            type="text"
            value={data.companyName}
            onChange={(e) => onUpdate({ companyName: e.target.value })}
            placeholder="e.g. TechVision Sdn Bhd"
            className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-electric"
          />
        </div>

        {/* Company Stage */}
        <div>
          <label className="block text-sm font-medium mb-3">Company Stage</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {stages.map((st) => (
              <button
                key={st.value}
                onClick={() => onUpdate({ companyStage: st.value })}
                className={`p-4 rounded-xl border text-left transition-all ${
                  data.companyStage === st.value
                    ? "border-electric bg-electric/10"
                    : "border-border hover:border-electric/50 hover:bg-accent"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>{st.emoji}</span>
                  <span className={`text-sm font-semibold ${data.companyStage === st.value ? "text-electric" : ""}`}>
                    {st.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground ml-7">{st.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-3">Industry</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {industries.map((ind) => (
              <button
                key={ind.value}
                onClick={() => onUpdate({ industry: ind.value })}
                className={`p-3 rounded-xl border text-left text-sm transition-all flex items-center gap-2 ${
                  data.industry === ind.value
                    ? "border-electric bg-electric/10 text-electric font-semibold"
                    : "border-border hover:border-electric/50 hover:bg-accent"
                }`}
              >
                <span>{ind.emoji}</span>
                <span>{ind.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-3">Team Size</label>
          <div className="flex flex-wrap gap-2">
            {teamSizes.map((ts) => (
              <button
                key={ts.label}
                onClick={() => handleTeamSizeSelect(ts.value)}
                className={`px-5 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  getTeamSizeLabel() === ts.label
                    ? "border-electric bg-electric/10 text-electric"
                    : "border-border hover:border-electric/50"
                }`}
              >
                {ts.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Years in Operation</label>
          <div className="flex gap-2">
            {[
              { value: 1, label: "<1 yr" },
              { value: 2, label: "1–3" },
              { value: 4, label: "3–5" },
              { value: 7, label: "5–10" },
              { value: 12, label: "10+" },
            ].map((yr) => (
              <button
                key={yr.value}
                onClick={() => onUpdate({ yearsOperating: yr.value })}
                className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  data.yearsOperating === yr.value
                    ? "border-electric bg-electric/10 text-electric"
                    : "border-border hover:border-electric/50"
                }`}
              >
                {yr.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button variant="electric" size="lg" onClick={onNext} disabled={!isValid}>
          Next: Financials
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </Card>
  )
}
