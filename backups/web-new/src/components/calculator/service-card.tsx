import { Check, Star, ArrowRight, Zap } from "lucide-react"
import type { ServiceRecommendation } from "@/lib/calculator-types"
import { formatRM } from "@/lib/growth-calculator"

interface ServiceCardProps {
  service: ServiceRecommendation
  isRecommended?: boolean
  matchCount?: number
}

export function ServiceCard({ service, isRecommended, matchCount = 0 }: ServiceCardProps) {
  const isTier = service.category === "tier"

  // Get per-pain impacts that match the user's selected pain points
  const relevantImpacts = service.serviceImpacts.slice(0, 4) // show top 4

  return (
    <div
      className={`relative rounded-xl border p-5 transition-all ${
        isRecommended
          ? "border-electric bg-electric/5 shadow-lg shadow-electric/10"
          : "border-border bg-card hover:border-electric/30"
      }`}
    >
      {isRecommended && (
        <div className="absolute -top-3 right-4 bg-electric text-navy text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
          <Star className="w-3 h-3" />
          RECOMMENDED
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-heading font-bold text-lg">{service.name}</h3>
          {isTier ? (
            <span className="text-xs text-electric font-semibold uppercase tracking-wider">
              Managed IT Plan
            </span>
          ) : (
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Add-On
            </span>
          )}
        </div>
        {service.growthMultiplier > 0 && (
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Growth boost</div>
            <div className="text-sm font-bold text-electric">+{(service.growthMultiplier * 100).toFixed(1)}%</div>
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-4">{service.description}</p>

      <div className="flex items-baseline gap-2 mb-4">
        {service.monthlyCost > 0 ? (
          <>
            <span className="text-2xl font-bold">{formatRM(service.monthlyCost)}</span>
            <span className="text-sm text-muted-foreground">/month</span>
          </>
        ) : service.oneOffCost > 0 ? (
          <>
            <span className="text-2xl font-bold">{formatRM(service.oneOffCost)}</span>
            <span className="text-sm text-muted-foreground">one-time</span>
          </>
        ) : (
          <span className="text-2xl font-bold text-electric">Free</span>
        )}
      </div>

      {service.stretch && !service.affordable && (
        <div className="mb-3 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <span className="text-xs text-amber-400 font-medium">
            <Zap className="w-3 h-3 inline mr-1" />
            Stretch option — slightly above your stated budget
          </span>
        </div>
      )}

      {matchCount > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-electric mb-3">
          <Check className="w-3.5 h-3.5" />
          <span>Matches {matchCount} of your pain point{matchCount !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Per-pain impact details */}
      {relevantImpacts.length > 0 && (
        <div className="space-y-2 mb-4">
          {relevantImpacts.map((impact) => (
            <div key={impact.painPoint} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{impact.description}</span>
              <span className="text-green-400 font-medium shrink-0 ml-2">
                {impact.monthlySavingRM > 0 ? `+${formatRM(impact.monthlySavingRM)}/mo` : ""}{" "}
                {impact.hoursSavedPerWeek > 0 ? `${impact.hoursSavedPerWeek}h/wk` : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {isRecommended && (
        <a
          href="https://wa.me/601154034051"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center justify-center w-full h-9 rounded-md px-3 bg-electric text-navy hover:bg-electric/90 font-semibold text-sm transition-colors"
        >
          Get Started
          <ArrowRight className="w-4 h-4 ml-2" />
        </a>
      )}
    </div>
  )
}
