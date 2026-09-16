export type PainPoint =
  | "compliance"
  | "reporting"
  | "ticketing"
  | "backup"
  | "security"
  | "onboarding"
  | "ai_automation"
  | "cloud_migration"

export type TimeHorizon = 12 | 24 | 36

export type Industry =
  | "services"
  | "retail"
  | "manufacturing"
  | "technology"
  | "healthcare"
  | "education"
  | "finance"
  | "logistics"
  | "other"

export type CompanyStage =
  | "pre_seed"    // Pre-revenue / idea stage
  | "seed"        // Early revenue, < RM 50K/mo
  | "growth"      // RM 50K–200K/mo
  | "established" // RM 200K+/mo

// ── Wizard Input ───────────────────────────────────────────────────

export interface CalculatorInput {
  companyName: string
  industry: Industry
  companyStage: CompanyStage
  teamSize: number
  yearsOperating: number
  monthlyRevenue: number
  monthlyExpenses: number
  currentItSpend: number
  painPoints: PainPoint[]
  targetGrowthPct: number
  timeHorizon: TimeHorizon
  maxBudget: number // 0 = maximize ROI
}

// ── Pain Impact Model ──────────────────────────────────────────────

export interface PainImpact {
  painPoint: PainPoint
  label: string
  emoji: string
  description: string
  /** Estimated annual cost of this pain (RM) */
  annualCostRM: number
  /** Hours per week lost to this pain */
  hoursPerWeek: number
  /** Severity 1-5 (drives urgency) */
  severity: number
  /** DI services that directly address this pain */
  diSolution: string
  /** How much of the annual cost DI can recover (0-1) */
  recoveryRate: number
}

export interface CostOfInaction {
  /** Total annual cost across all selected pain points */
  totalAnnualCostRM: number
  /** Total hours per week lost */
  totalHoursPerWeek: number
  /** Per-pain breakdown */
  painImpacts: PainImpact[]
  /** 12-month compounded loss */
  projectedLoss12M: number
  /** 24-month compounded loss */
  projectedLoss24M: number
  /** 36-month compounded loss */
  projectedLoss36M: number
  /** Founder hours/week lost (for startups) */
  founderHoursLost: number
  /** Monthly burn rate impact */
  burnRateImpact: number
}

// ── Comparison Scenarios ───────────────────────────────────────────

export interface ComparisonScenario {
  id: "nothing" | "hire" | "di"
  label: string
  emoji: string
  description: string
  monthlyCostRM: number
  oneOffCostRM: number
  growthImpact: number
  efficiencyGain: number
  hoursRecovered: number
  risk: number
  coveragePct: number
}

// ── Service with per-pain impact ───────────────────────────────────

export interface ServiceImpact {
  painPoint: PainPoint
  monthlySavingRM: number
  hoursSavedPerWeek: number
  description: string
}

export interface ServiceRecommendation {
  id: string
  name: string
  category: "tier" | "addon"
  monthlyCost: number
  oneOffCost: number
  description: string
  growthMultiplier: number
  matchesPainPoint: PainPoint[]
  serviceImpacts: ServiceImpact[]
  affordable: boolean
  stretch: boolean
  priority: number
  /** Stage this tier is best suited for */
  bestForStage: CompanyStage[]
}

// ── Month-by-month ─────────────────────────────────────────────────

export interface MonthProjection {
  month: number
  baselineRevenue: number
  diRevenue: number
  nothingRevenue: number
  baselineExpenses: number
  diExpenses: number
  diCost: number
  savings: number
  baselineProfit: number
  diProfit: number
  nothingProfit: number
  cumulativeROI: number
  revenueLift: number
  painCostAvoided: number
  /** Runway months remaining (startups) */
  runwayMonths: number
  /** Burn rate with DI vs without */
  burnRateWithDI: number
  burnRateWithoutDI: number
}

// ── Final Result ───────────────────────────────────────────────────

export interface CalculatorResult {
  monthlyProjections: MonthProjection[]
  costOfInaction: CostOfInaction
  scenarios: ComparisonScenario[]
  recommendedTier: ServiceRecommendation
  recommendedAddOns: ServiceRecommendation[]
  allAffordableServices: ServiceRecommendation[]
  totalInvestment: number
  totalSavings: number
  netBenefit: number
  breakEvenMonth: number
  yearOneROI: number
  projectedRevenueGrowth: number
  idealBudgetPct: number
  input: CalculatorInput
  /** Runway extension in months (startups) */
  runwayExtensionMonths: number
  /** Founder hours recovered per week */
  founderHoursRecovered: number
}
