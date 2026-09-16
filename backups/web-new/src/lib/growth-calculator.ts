import type {
  CalculatorInput,
  CalculatorResult,
  ComparisonScenario,
  CostOfInaction,
  MonthProjection,
  PainImpact,
  PainPoint,
  ServiceRecommendation,
  CompanyStage,
} from "./calculator-types"

// ── Stage Multipliers ──────────────────────────────────────────────
// Scale pain costs and recovery rates by company stage

const STAGE_MULTIPLIERS: Record<CompanyStage, {
  costScale: number      // multiply base pain costs
  hoursScale: number     // multiply base hours lost
  founderWeight: number  // how much founder time is worth (RM/hr)
  burnRateBase: number   // estimated monthly burn
  runwayMonths: number   // starting runway
}> = {
  pre_seed:  { costScale: 0.5,  hoursScale: 1.4, founderWeight: 150, burnRateBase: 15000, runwayMonths: 8 },
  seed:      { costScale: 0.7,  hoursScale: 1.2, founderWeight: 200, burnRateBase: 40000, runwayMonths: 14 },
  growth:    { costScale: 1.0,  hoursScale: 1.0, founderWeight: 250, burnRateBase: 120000, runwayMonths: 24 },
  established: { costScale: 1.3, hoursScale: 0.8, founderWeight: 300, burnRateBase: 300000, runwayMonths: 999 },
}

// ── Pain Impact Database ───────────────────────────────────────────
// Base costs for "growth" stage — scaled by stage multiplier

const PAIN_IMPACTS: Record<PainPoint, Omit<PainImpact, "painPoint">> = {
  compliance: {
    label: "PDPA / Compliance",
    emoji: "📋",
    description: "Regulatory deadlines, audit prep, and policy management drain time and carry penalty risk.",
    annualCostRM: 24000,
    hoursPerWeek: 8,
    severity: 4,
    diSolution: "Autonomous Ops monitors compliance 24/7, auto-generates audit trails, flags gaps before fines.",
    recoveryRate: 0.85,
  },
  reporting: {
    label: "Manual Reporting",
    emoji: "📊",
    description: "Hours spent compiling spreadsheets, chasing data, and building dashboards that are outdated instantly.",
    annualCostRM: 36000,
    hoursPerWeek: 12,
    severity: 3,
    diSolution: "Real-time dashboards and automated reports replace 10+ hours of manual work every week.",
    recoveryRate: 0.90,
  },
  ticketing: {
    label: "IT Support / Ticketing",
    emoji: "🎫",
    description: "Slow response times, unresolved issues, and staff waiting for IT help that never comes fast enough.",
    annualCostRM: 18000,
    hoursPerWeek: 6,
    severity: 3,
    diSolution: "24/7 managed helpdesk with SLA guarantees. Issues resolved in hours, not days.",
    recoveryRate: 0.75,
  },
  backup: {
    label: "Backup & Disaster Recovery",
    emoji: "💾",
    description: "One ransomware attack or hardware failure could wipe out your data. Recovery costs average RM 50K+.",
    annualCostRM: 30000,
    hoursPerWeek: 4,
    severity: 5,
    diSolution: "Automated backups, tested recovery plans, and immutable storage. Your data survives anything.",
    recoveryRate: 0.95,
  },
  security: {
    label: "Cybersecurity Gaps",
    emoji: "🔒",
    description: "Unprotected endpoints, phishing vulnerabilities, no incident response. Average breach cost: RM 180K.",
    annualCostRM: 42000,
    hoursPerWeek: 5,
    severity: 5,
    diSolution: "Full cybersecurity stack: endpoint protection, SIEM monitoring, phishing simulation, incident response.",
    recoveryRate: 0.80,
  },
  onboarding: {
    label: "Staff Onboarding",
    emoji: "👥",
    description: "New hires take 2-4 weeks to become productive. IT setup alone eats 3+ days per employee.",
    annualCostRM: 15000,
    hoursPerWeek: 3,
    severity: 2,
    diSolution: "Automated provisioning, standardized setups, and training workflows get new hires productive in days.",
    recoveryRate: 0.70,
  },
  ai_automation: {
    label: "AI / Process Automation",
    emoji: "🤖",
    description: "Repetitive tasks consume 30%+ of team capacity. Competitors using AI are pulling ahead fast.",
    annualCostRM: 48000,
    hoursPerWeek: 15,
    severity: 4,
    diSolution: "Custom AI workflows automate repetitive tasks, freeing your team for high-value work.",
    recoveryRate: 0.65,
  },
  cloud_migration: {
    label: "Cloud Migration",
    emoji: "☁️",
    description: "On-prem infrastructure limits scalability, increases costs, and creates single points of failure.",
    annualCostRM: 20000,
    hoursPerWeek: 5,
    severity: 3,
    diSolution: "Zero-downtime migration to cloud with managed infrastructure, auto-scaling, and cost optimization.",
    recoveryRate: 0.80,
  },
}

// ── Industry growth baselines (monthly organic) ─────────────────────

const INDUSTRY_GROWTH: Record<string, number> = {
  services: 0.012,
  retail: 0.010,
  manufacturing: 0.008,
  technology: 0.020,
  healthcare: 0.010,
  education: 0.008,
  finance: 0.015,
  logistics: 0.011,
  other: 0.010,
}

// ── DI Service Catalogue ───────────────────────────────────────────

const SERVICES: Omit<ServiceRecommendation, "affordable" | "stretch">[] = [
  {
    id: "starter",
    name: "Starter",
    category: "tier",
    monthlyCost: 800,
    oneOffCost: 0,
    description: "Remote helpdesk, 3 devices, basic security monitoring, monthly check-in",
    growthMultiplier: 0.012,
    matchesPainPoint: ["ticketing", "backup"],
    serviceImpacts: [
      { painPoint: "ticketing", monthlySavingRM: 800, hoursSavedPerWeek: 3, description: "Basic helpdesk support" },
      { painPoint: "backup", monthlySavingRM: 1000, hoursSavedPerWeek: 2, description: "Cloud backup setup" },
    ],
    priority: 1,
    bestForStage: ["pre_seed", "seed"],
  },
  {
    id: "foundation",
    name: "Foundation",
    category: "tier",
    monthlyCost: 1500,
    oneOffCost: 0,
    description: "Remote helpdesk, 5 devices, monthly maintenance, security monitoring",
    growthMultiplier: 0.02,
    matchesPainPoint: ["ticketing", "backup"],
    serviceImpacts: [
      { painPoint: "ticketing", monthlySavingRM: 1500, hoursSavedPerWeek: 4, description: "Managed helpdesk with SLA" },
      { painPoint: "backup", monthlySavingRM: 2000, hoursSavedPerWeek: 3, description: "Automated backup with monitoring" },
    ],
    priority: 2,
    bestForStage: ["seed", "growth"],
  },
  {
    id: "growth",
    name: "Growth",
    category: "tier",
    monthlyCost: 3500,
    oneOffCost: 0,
    description: "24/7 helpdesk, 20 devices, weekly maintenance, advanced security, on-site support",
    growthMultiplier: 0.04,
    matchesPainPoint: ["ticketing", "security", "backup", "reporting"],
    serviceImpacts: [
      { painPoint: "ticketing", monthlySavingRM: 2500, hoursSavedPerWeek: 5, description: "24/7 managed helpdesk with on-site" },
      { painPoint: "security", monthlySavingRM: 3000, hoursSavedPerWeek: 4, description: "Advanced endpoint protection + SIEM" },
      { painPoint: "backup", monthlySavingRM: 2500, hoursSavedPerWeek: 3, description: "Full DR with tested recovery" },
      { painPoint: "reporting", monthlySavingRM: 1500, hoursSavedPerWeek: 3, description: "Automated reporting dashboards" },
    ],
    priority: 3,
    bestForStage: ["growth"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    category: "tier",
    monthlyCost: 8000,
    oneOffCost: 0,
    description: "Unlimited devices, daily maintenance, full cybersecurity, dedicated IT manager",
    growthMultiplier: 0.06,
    matchesPainPoint: ["ticketing", "security", "backup", "reporting", "onboarding", "compliance"],
    serviceImpacts: [
      { painPoint: "ticketing", monthlySavingRM: 3000, hoursSavedPerWeek: 6, description: "Dedicated IT manager + 24/7 helpdesk" },
      { painPoint: "security", monthlySavingRM: 4500, hoursSavedPerWeek: 5, description: "Full cybersecurity stack + incident response" },
      { painPoint: "backup", monthlySavingRM: 3000, hoursSavedPerWeek: 4, description: "Enterprise DR with immutable storage" },
      { painPoint: "reporting", monthlySavingRM: 3000, hoursSavedPerWeek: 8, description: "Custom dashboards + automated reports" },
      { painPoint: "onboarding", monthlySavingRM: 1200, hoursSavedPerWeek: 3, description: "Automated provisioning + training" },
      { painPoint: "compliance", monthlySavingRM: 2000, hoursSavedPerWeek: 6, description: "Compliance monitoring + audit prep" },
    ],
    priority: 4,
    bestForStage: ["growth", "established"],
  },
  {
    id: "autonomous_ops",
    name: "Autonomous Ops",
    category: "addon",
    monthlyCost: 2000,
    oneOffCost: 0,
    description: "AI-powered 24/7 monitoring across IT, compliance, finance, and marketing",
    growthMultiplier: 0.015,
    matchesPainPoint: ["compliance", "reporting", "ticketing"],
    serviceImpacts: [
      { painPoint: "compliance", monthlySavingRM: 2000, hoursSavedPerWeek: 7, description: "Auto-compliance monitoring + alerts" },
      { painPoint: "reporting", monthlySavingRM: 2500, hoursSavedPerWeek: 8, description: "Real-time AI-generated dashboards" },
      { painPoint: "ticketing", monthlySavingRM: 1000, hoursSavedPerWeek: 2, description: "AI triage and auto-resolution" },
    ],
    priority: 5,
    bestForStage: ["seed", "growth", "established"],
  },
  {
    id: "ai_implementation",
    name: "AI Implementation",
    category: "addon",
    monthlyCost: 0,
    oneOffCost: 5000,
    description: "Custom AI chatbots, process automation, and ML solutions tailored to your business",
    growthMultiplier: 0.025,
    matchesPainPoint: ["ai_automation", "reporting", "onboarding"],
    serviceImpacts: [
      { painPoint: "ai_automation", monthlySavingRM: 4000, hoursSavedPerWeek: 12, description: "Custom workflow automation" },
      { painPoint: "reporting", monthlySavingRM: 2000, hoursSavedPerWeek: 6, description: "AI-powered analytics and insights" },
      { painPoint: "onboarding", monthlySavingRM: 800, hoursSavedPerWeek: 2, description: "AI onboarding assistant" },
    ],
    priority: 6,
    bestForStage: ["growth", "established"],
  },
  {
    id: "cloud_migration",
    name: "Cloud Migration",
    category: "addon",
    monthlyCost: 0,
    oneOffCost: 8000,
    description: "Complete migration to AWS, Azure, or Google Cloud with zero downtime",
    growthMultiplier: 0.012,
    matchesPainPoint: ["cloud_migration", "backup", "security"],
    serviceImpacts: [
      { painPoint: "cloud_migration", monthlySavingRM: 1700, hoursSavedPerWeek: 4, description: "Full cloud migration + optimization" },
      { painPoint: "backup", monthlySavingRM: 1500, hoursSavedPerWeek: 2, description: "Cloud-native backup and DR" },
      { painPoint: "security", monthlySavingRM: 1200, hoursSavedPerWeek: 1, description: "Cloud security posture management" },
    ],
    priority: 7,
    bestForStage: ["seed", "growth", "established"],
  },
  {
    id: "pdpa_compliance",
    name: "PDPA Compliance",
    category: "addon",
    monthlyCost: 0,
    oneOffCost: 3500,
    description: "Full audit, policy documents, and compliance setup for Malaysian PDPA",
    growthMultiplier: 0.008,
    matchesPainPoint: ["compliance", "security"],
    serviceImpacts: [
      { painPoint: "compliance", monthlySavingRM: 2000, hoursSavedPerWeek: 6, description: "Complete PDPA compliance setup" },
      { painPoint: "security", monthlySavingRM: 500, hoursSavedPerWeek: 1, description: "Data protection policies + training" },
    ],
    priority: 8,
    bestForStage: ["seed", "growth", "established"],
  },
  {
    id: "staff_training",
    name: "Staff Training",
    category: "addon",
    monthlyCost: 0,
    oneOffCost: 1500,
    description: "Cybersecurity awareness training for your team (in-person or online)",
    growthMultiplier: 0.004,
    matchesPainPoint: ["security", "onboarding"],
    serviceImpacts: [
      { painPoint: "security", monthlySavingRM: 800, hoursSavedPerWeek: 1, description: "Cybersecurity awareness training" },
      { painPoint: "onboarding", monthlySavingRM: 500, hoursSavedPerWeek: 1, description: "Standardized IT onboarding training" },
    ],
    priority: 9,
    bestForStage: ["pre_seed", "seed", "growth"],
  },
]

// ── Helpers ─────────────────────────────────────────────────────────

function round(n: number, decimals = 0): number {
  const f = 10 ** decimals
  return Math.round(n * f) / f
}

function clampMonth(month: number): number {
  return Math.max(1, month)
}

function getScaledPainImpacts(
  painPoints: PainPoint[],
  stage: CompanyStage,
): PainImpact[] {
  const mult = STAGE_MULTIPLIERS[stage]
  return painPoints.map((pp) => ({
    painPoint: pp,
    ...PAIN_IMPACTS[pp],
    annualCostRM: round(PAIN_IMPACTS[pp].annualCostRM * mult.costScale),
    hoursPerWeek: round(PAIN_IMPACTS[pp].hoursPerWeek * mult.hoursScale, 1),
  }))
}

// ── Cost of Inaction Calculator ────────────────────────────────────

export function calculateCostOfInaction(
  painPoints: PainPoint[],
  stage: CompanyStage,
): CostOfInaction {
  const painImpacts = getScaledPainImpacts(painPoints, stage)

  const totalAnnualCostRM = painImpacts.reduce((sum, p) => sum + p.annualCostRM, 0)
  const totalHoursPerWeek = painImpacts.reduce((sum, p) => sum + p.hoursPerWeek, 0)

  // For startups, founder time is the biggest cost
  const founderHoursLost = stage === "pre_seed" || stage === "seed"
    ? totalHoursPerWeek * 0.7  // 70% of lost hours are founder hours
    : totalHoursPerWeek * 0.3  // 30% for established companies

  // Burn rate impact: pain costs as % of monthly burn
  const burnRateImpact = totalAnnualCostRM / 12

  const growthFactor = 0.08
  const projectedLoss12M = totalAnnualCostRM * (1 + growthFactor)
  const projectedLoss24M = totalAnnualCostRM * ((1 + growthFactor) ** 2 + (1 + growthFactor))
  const projectedLoss36M = totalAnnualCostRM * ((1 + growthFactor) ** 3 + (1 + growthFactor) ** 2 + (1 + growthFactor))

  return {
    totalAnnualCostRM,
    totalHoursPerWeek,
    painImpacts,
    projectedLoss12M: round(projectedLoss12M),
    projectedLoss24M: round(projectedLoss24M),
    projectedLoss36M: round(projectedLoss36M),
    founderHoursLost: round(founderHoursLost, 1),
    burnRateImpact: round(burnRateImpact),
  }
}

// ── Comparison Scenarios ───────────────────────────────────────────

export function buildScenarios(
  input: CalculatorInput,
  recommendedTier: ServiceRecommendation,
  recommendedAddOns: ServiceRecommendation[],
): ComparisonScenario[] {
  const totalDiMonthly = recommendedTier.monthlyCost + recommendedAddOns.reduce((a, s) => a + s.monthlyCost, 0)
  const totalOneOff = recommendedAddOns.reduce((a, s) => a + s.oneOffCost, 0)
  const diHoursRecovered = recommendedTier.serviceImpacts
    .concat(recommendedAddOns.flatMap((a) => a.serviceImpacts))
    .reduce((sum, imp) => sum + imp.hoursSavedPerWeek, 0)

  const painCount = input.painPoints.length
  const baseGrowth = INDUSTRY_GROWTH[input.industry] ?? 0.01

  // Hiring cost varies by stage
  const hireCost = input.companyStage === "pre_seed" ? 3000 :
                   input.companyStage === "seed" ? 4000 :
                   input.companyStage === "growth" ? 5000 : 6000
  const hireHours = 30
  const hireGrowth = baseGrowth * 0.4

  return [
    {
      id: "nothing",
      label: "Do Nothing",
      emoji: "🚫",
      description: "Keep现状. Pain compounds, competitors pull ahead, costs grow 8% annually.",
      monthlyCostRM: 0,
      oneOffCostRM: 0,
      growthImpact: 0,
      efficiencyGain: 0,
      hoursRecovered: 0,
      risk: 5,
      coveragePct: 0,
    },
    {
      id: "hire",
      label: "Hire In-House",
      emoji: "👤",
      description: `Hire 1 IT staff at ~RM ${hireCost.toLocaleString()}/mo. Partial coverage, single point of failure.`,
      monthlyCostRM: hireCost,
      oneOffCostRM: 8000,
      growthImpact: hireGrowth,
      efficiencyGain: 0.02,
      hoursRecovered: hireHours,
      risk: 3,
      coveragePct: Math.min(40, painCount * 8),
    },
    {
      id: "di",
      label: "Duta Integra",
      emoji: "🚀",
      description: `${recommendedTier.name} plan + ${recommendedAddOns.length} add-on${recommendedAddOns.length !== 1 ? "s" : ""}. Full coverage across ${painCount} pain point${painCount !== 1 ? "s" : ""}.`,
      monthlyCostRM: totalDiMonthly,
      oneOffCostRM: totalOneOff,
      growthImpact: baseGrowth + recommendedTier.growthMultiplier + recommendedAddOns.reduce((a, s) => a + s.growthMultiplier, 0),
      efficiencyGain: 0.06,
      hoursRecovered: diHoursRecovered,
      risk: 1,
      coveragePct: Math.min(95, painCount * 15 + 10),
    },
  ]
}

// ── Core Engine ────────────────────────────────────────────────────

export function calculateGrowth(input: CalculatorInput): CalculatorResult {
  const {
    industry,
    companyStage,
    teamSize,
    monthlyRevenue,
    monthlyExpenses,
    painPoints,
    timeHorizon,
    maxBudget,
  } = input

  const stageData = STAGE_MULTIPLIERS[companyStage]

  // 1. Calculate cost of inaction (stage-scaled)
  const costOfInaction = calculateCostOfInaction(painPoints, companyStage)

  // 2. Score & rank services based on pain profile + stage fit
  const scored = SERVICES.map((s) => {
    let score = 0

    // Pain match score
    const painMatches = s.matchesPainPoint.filter((p) => painPoints.includes(p)).length
    score += painMatches * 25

    // Per-pain impact score
    const totalSaving = s.serviceImpacts
      .filter((imp) => painPoints.includes(imp.painPoint))
      .reduce((sum, imp) => sum + imp.monthlySavingRM, 0)
    score += totalSaving / 100

    // Hours recovered score
    const totalHours = s.serviceImpacts
      .filter((imp) => painPoints.includes(imp.painPoint))
      .reduce((sum, imp) => sum + imp.hoursSavedPerWeek, 0)
    score += totalHours * 2

    // Stage fit bonus
    if (s.bestForStage.includes(companyStage)) {
      score += 20
    }

    // Team size fit
    if (s.category === "tier") {
      if (s.id === "starter" && teamSize <= 5) score += 20
      if (s.id === "foundation" && teamSize > 3 && teamSize <= 10) score += 15
      if (s.id === "growth" && teamSize > 10 && teamSize <= 30) score += 20
      if (s.id === "enterprise" && teamSize > 30) score += 20
    }

    return { ...s, score }
  })

  const monthlyBudget = maxBudget > 0 ? maxBudget : Infinity

  const allServices: ServiceRecommendation[] = scored
    .sort((a, b) => b.score - a.score)
    .map((s) => ({
      ...s,
      affordable: s.monthlyCost <= monthlyBudget,
      stretch: s.monthlyCost > monthlyBudget && s.monthlyCost <= monthlyBudget * 1.2,
    }))

  // Pick recommended tier: best-scored tier that fits budget + stage
  const affordableTiers = allServices.filter(
    (s) => s.category === "tier" && (s.affordable || s.stretch || maxBudget === 0)
  )
  const recommendedTier =
    affordableTiers.find((t) => t.affordable) ?? affordableTiers[affordableTiers.length - 1] ?? allServices[0]

  // Pick recommended add-ons
  const recommendedAddOns = allServices
    .filter(
      (s) =>
        s.category === "addon" &&
        (s.affordable || s.stretch || maxBudget === 0) &&
        s.id !== recommendedTier.id &&
        s.matchesPainPoint.some((p) => painPoints.includes(p))
    )
    .slice(0, 3)

  // 3. Build comparison scenarios
  const scenarios = buildScenarios(input, recommendedTier, recommendedAddOns)

  // 4. Month-by-month projection
  const monthlyProjections: MonthProjection[] = []
  let baselineRev = monthlyRevenue
  let diRev = monthlyRevenue
  let nothingRev = monthlyRevenue
  let baselineExp = monthlyExpenses
  let diExp = monthlyExpenses
  let cumulativeDIInvestment = 0
  let cumulativeSavings = 0
  let breakEvenMonth = timeHorizon + 1

  const totalDiMonthlyCost = recommendedTier.monthlyCost + recommendedAddOns.reduce((a, s) => a + s.monthlyCost, 0)
  const oneOffCosts = recommendedAddOns.reduce((a, s) => a + s.oneOffCost, 0)

  const baseMonthlyGrowth = INDUSTRY_GROWTH[industry] ?? 0.01
  const diScenario = scenarios.find((s) => s.id === "di")!
  const diGrowthRate = diScenario.growthImpact

  // Pain cost avoided per month (from service impacts)
  const monthlyPainRecovery =
    recommendedTier.serviceImpacts
      .concat(recommendedAddOns.flatMap((a) => a.serviceImpacts))
      .filter((imp) => painPoints.includes(imp.painPoint))
      .reduce((sum, imp) => sum + imp.monthlySavingRM, 0)

  // Starting burn rate
  const startingBurn = stageData.burnRateBase

  for (let m = 1; m <= timeHorizon; m++) {
    // Do Nothing
    nothingRev *= 1 + baseMonthlyGrowth * 0.7

    // Baseline
    baselineRev *= 1 + baseMonthlyGrowth
    baselineExp *= 1 + 0.008

    // DI-augmented
    const rampFactor = 1 - Math.exp(-m / 3)
    const currentDiGrowth = baseMonthlyGrowth + diGrowthRate * rampFactor
    diRev *= 1 + currentDiGrowth

    const automationSavings = m > 3 ? 0.002 * Math.min(m - 3, 12) / 12 : 0
    diExp *= 1 + 0.008 - automationSavings

    const monthDiCost = totalDiMonthlyCost + (m === 1 ? oneOffCosts : 0)
    const monthSavings = monthlyPainRecovery * rampFactor

    const baselineProfit = baselineRev - baselineExp
    const diProfit = diRev - diExp - monthDiCost + monthSavings
    const nothingProfit = nothingRev - (baselineExp * 1.08)

    cumulativeDIInvestment += monthDiCost
    cumulativeSavings += monthSavings

    const cumulativeROI =
      cumulativeDIInvestment > 0
        ? round(((cumulativeSavings - cumulativeDIInvestment) / cumulativeDIInvestment) * 100, 1)
        : 0

    if (breakEvenMonth > timeHorizon && diProfit > baselineProfit && m > 1) {
      breakEvenMonth = m
    }

    // Runway calculation (for startups)
    const monthlyBurnWithoutDI = startingBurn * (1 + 0.008) ** m
    const monthlyBurnWithDI = startingBurn * (1 + 0.008 - automationSavings) ** m + monthDiCost - monthSavings
    const runwayWithDI = diRev > 0 ? Math.max(0, (diRev - monthlyBurnWithDI) / monthlyBurnWithDI * 12) : 999

    monthlyProjections.push({
      month: m,
      baselineRevenue: round(baselineRev),
      diRevenue: round(diRev),
      nothingRevenue: round(nothingRev),
      baselineExpenses: round(baselineExp),
      diExpenses: round(diExp),
      diCost: round(monthDiCost),
      savings: round(monthSavings),
      baselineProfit: round(baselineProfit),
      diProfit: round(diProfit),
      nothingProfit: round(nothingProfit),
      cumulativeROI,
      revenueLift: round(diRev - baselineRev),
      painCostAvoided: round(monthSavings),
      runwayMonths: round(runwayWithDI, 1),
      burnRateWithDI: round(monthlyBurnWithDI),
      burnRateWithoutDI: round(monthlyBurnWithoutDI),
    })
  }

  const lastProjection = monthlyProjections[monthlyProjections.length - 1]
  const totalInvestment = cumulativeDIInvestment
  const totalSavings = cumulativeSavings
  const netBenefit = lastProjection.diProfit - lastProjection.nothingProfit
  const yearOneROI =
    monthlyProjections.length >= 12
      ? monthlyProjections[11].cumulativeROI
      : lastProjection.cumulativeROI

  // Runway extension (startups)
  const runwayExtensionMonths = companyStage === "pre_seed" || companyStage === "seed"
    ? round(lastProjection.runwayMonths - (monthlyRevenue > 0 ? (monthlyRevenue - startingBurn) / startingBurn * 12 : 0), 1)
    : 0

  // Founder hours recovered
  const founderHoursRecovered = costOfInaction.founderHoursLost * (
    recommendedTier.serviceImpacts
      .concat(recommendedAddOns.flatMap((a) => a.serviceImpacts))
      .filter((imp) => painPoints.includes(imp.painPoint))
      .reduce((sum, imp) => sum + imp.hoursSavedPerWeek, 0) / costOfInaction.totalHoursPerWeek
  )

  const idealBudgetPct = companyStage === "pre_seed" ? 3 :
                         companyStage === "seed" ? 5 :
                         companyStage === "growth" ? 7 : 8

  return {
    monthlyProjections,
    costOfInaction,
    scenarios,
    recommendedTier,
    recommendedAddOns,
    allAffordableServices: allServices,
    totalInvestment: round(totalInvestment),
    totalSavings: round(totalSavings),
    netBenefit: round(netBenefit),
    breakEvenMonth: clampMonth(breakEvenMonth),
    yearOneROI: round(yearOneROI, 1),
    projectedRevenueGrowth: round(
      ((lastProjection.diRevenue - monthlyRevenue) / monthlyRevenue) * 100,
      1
    ),
    idealBudgetPct,
    input,
    runwayExtensionMonths: round(runwayExtensionMonths, 1),
    founderHoursRecovered: round(founderHoursRecovered, 1),
  }
}

// ── Formatting helpers ──────────────────────────────────────────────

export function formatRM(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `RM ${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `RM ${(n / 1_000).toFixed(1)}K`
  return `RM ${n.toLocaleString()}`
}

export function formatRMBig(n: number): string {
  return `RM ${n.toLocaleString("en-MY", { maximumFractionDigits: 0 })}`
}

export function formatPct(n: number): string {
  const sign = n >= 0 ? "+" : ""
  return `${sign}${n.toFixed(1)}%`
}

export { PAIN_IMPACTS, STAGE_MULTIPLIERS }
