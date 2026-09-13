/**
 * Automation savings calculator.
 *
 * POST /api/calculator
 * Body: { staff: number, manualHours: number, painPoints: string[] }
 *
 * Returns estimated hours and cost saved per tier.
 * Uses DI's actual pricing (Foundation RM2,500, Growth RM5,500, AI Partner RM12,000)
 * and conservative automation estimates.
 */

const TIERS = [
  {
    name: "Foundation",
    monthlyPrice: 2500,
    automationRate: 0.35,
    description: "Basic IT management + ticketing",
  },
  {
    name: "Growth",
    monthlyPrice: 5500,
    automationRate: 0.55,
    description: "Managed IT + proactive monitoring + automation",
  },
  {
    name: "AI Partner",
    monthlyPrice: 12000,
    automationRate: 0.75,
    description: "Full AI-driven automation + strategic IT",
  },
];

const PAIN_MULTIPLIERS = {
  compliance: 1.25,
  reporting: 1.15,
  ticketing: 1.20,
  backup: 1.10,
  security: 1.15,
  onboarding: 1.10,
};

const HOURS_TO_RM = 75; // conservative blended hourly rate

export function calculateSavings({ staff, manualHours, painPoints = [] }) {
  const s = Math.max(1, Number(staff) || 1);
  const mh = Math.max(0, Number(manualHours) || 0);

  const multiplier = painPoints.reduce(
    (acc, p) => acc * (PAIN_MULTIPLIERS[p] || 1),
    1
  );

  const tiers = TIERS.map((tier) => {
    const rawHoursSaved = mh * tier.automationRate * multiplier;
    const hoursSaved = Math.round(rawHoursSaved * 10) / 10;
    const monthlyCostSaved = Math.round(hoursSaved * HOURS_TO_RM);
    const annualCostSaved = monthlyCostSaved * 12;
    const roi = tier.monthlyPrice > 0
      ? Math.round(((monthlyCostSaved - tier.monthlyPrice) / tier.monthlyPrice) * 100)
      : 0;

    return {
      name: tier.name,
      description: tier.description,
      monthlyPrice: tier.monthlyPrice,
      hoursSaved,
      monthlyCostSaved,
      annualCostSaved,
      roi,
    };
  });

  const recommended = tiers.reduce((best, t) =>
    t.hoursSaved > 0 && t.roi > (best?.roi ?? -Infinity) ? t : best,
    null
  );

  return {
    input: { staff: s, manualHours: mh, painPoints },
    tiers,
    recommendedTier: recommended?.name ?? "Foundation",
  };
}
