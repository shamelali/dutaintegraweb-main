import { useEffect, useRef, useState } from "react"
import { CheckCircle2, MonitorCog, Package, PenTool, Settings2, ArrowLeft, Loader2 } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import type { TranslationKey } from "@/i18n/translations"
import { waLink } from "@/lib/dutaos"

/**
 * ProposalForm — the 3-step + success-state "fixed-price proposal" funnel
 * from the V2 Engineering Handoff Spec (§2). It replaces the standard
 * contact form for lead capture: bottleneck → team size → contact details
 * → success (with WhatsApp deep link).
 *
 * Adaptations from the raw spec snippet (deliberate, documented):
 * - Tailwind v4: `font-heading` / `font-body` map to --font-heading /
 *   --font-sans tokens; brand colors resolve to the site's existing
 *   navy/electric token set instead of the spec's teal (see DESIGN_SYSTEM.md).
 * - Step 4 submits to POST /api/send-email (same endpoint as the contact
 *   page) before showing the success state.
 * - Auto-advance after selection uses a ref-staged step so rapid clicks can
 *   never skip a step (the spec's `setStep(step + 1)` inside setTimeout had
 *   that race).
 * - Every option button is a >=44px touch target (checklist item 3).
 */

const TOTAL_STEPS = 4

const BOTTLENECKS: { id: string; labelKey: TranslationKey; icon: typeof MonitorCog }[] = [
  { id: "it", labelKey: "proposalOptIt", icon: MonitorCog },
  { id: "ai", labelKey: "proposalOptDataEntry", icon: Settings2 },
  { id: "ship", labelKey: "proposalOptShipping", icon: Package },
  { id: "dev", labelKey: "proposalOptSoftware", icon: PenTool },
]

const STAFF_SIZES = ["1 - 10", "11 - 50", "51 - 200", "200+"] as const

export function ProposalForm() {
  const { t } = useLanguage()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    bottleneck: "",
    staffSize: "",
    name: "",
    company: "",
    whatsapp: "",
    email: "",
  })
  const advanceTimer = useRef<number | null>(null)

  // Clean up pending auto-advance timers on unmount.
  useEffect(() => {
    return () => {
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current)
    }
  }, [])

  const handleSelect = (field: "bottleneck" | "staffSize", value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current)
    // Brief delay for UX feel (spec), but compute next step inside the
    // updater so two fast clicks can never jump two steps.
    advanceTimer.current = window.setTimeout(() => {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS))
      advanceTimer.current = null
    }, 300)
  }

  const goBack = () => {
    if (advanceTimer.current !== null) {
      window.clearTimeout(advanceTimer.current)
      advanceTimer.current = null
    }
    setStep((s) => Math.max(1, s - 1))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          company: formData.company,
          phone: `+60 ${formData.whatsapp}`,
          service: `Proposal request — ${formData.bottleneck} (${formData.staffSize} staff)`,
          message: `V2 proposal funnel: bottleneck=${formData.bottleneck}, staff=${formData.staffSize}, whatsapp=+60${formData.whatsapp}`,
          source: "proposal-form",
        }),
      }).catch(() => undefined) // lead capture is best-effort; never block the UX
    } finally {
      setSubmitting(false)
      setStep(4)
    }
  }

  const link = waLink(
    `Hi Duta Integra, I just submitted my proposal request for ${formData.bottleneck || "your services"} (${formData.staffSize || "n/a"} staff).`,
  )

  return (
    <div
      id="proposal-form"
      className="max-w-2xl mx-auto p-6 md:p-8 bg-card rounded-2xl shadow-xl border border-border"
    >
      {/* Progress bar */}
      <div className="h-1 w-full bg-muted rounded-full mb-8" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={TOTAL_STEPS}>
        <div
          className="h-1 bg-electric rounded-full transition-all duration-500"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      {/* Step 1: Bottleneck */}
      {step === 1 && (
        <div>
          <h3 className="text-2xl font-heading font-bold text-card-foreground mb-6">
            {t("proposalStep1Title")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {BOTTLENECKS.map(({ id, labelKey, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleSelect("bottleneck", id)}
                className="min-h-[44px] p-6 text-left border-2 border-border rounded-xl hover:border-electric hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-electric outline-none transition-colors"
              >
                <Icon className="w-8 h-8 mb-2 text-electric" aria-hidden="true" />
                <span className="block font-medium text-card-foreground">{t(labelKey)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Staff size */}
      {step === 2 && (
        <div>
          <button type="button" onClick={goBack} className="mb-4 inline-flex min-h-[44px] items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> {t("proposalBack")}
          </button>
          <h3 className="text-2xl font-heading font-bold text-card-foreground mb-6">
            {t("proposalStep2Title")}
          </h3>
          <div className="flex flex-wrap gap-3">
            {STAFF_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => handleSelect("staffSize", size)}
                className={`min-h-[44px] px-6 py-3 border-2 rounded-full font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-electric ${
                  formData.staffSize === size
                    ? "border-electric bg-electric text-navy"
                    : "border-border hover:border-electric hover:bg-muted/50"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Contact details */}
      {step === 3 && (
        <div>
          <button type="button" onClick={goBack} className="mb-4 inline-flex min-h-[44px] items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> {t("proposalBack")}
          </button>
          <h3 className="text-2xl font-heading font-bold text-card-foreground mb-6">
            {t("proposalStep3Title")}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              required
              autoComplete="name"
              placeholder={t("proposalFieldName")}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full min-h-[44px] p-4 border border-input rounded-lg bg-transparent text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-electric outline-none"
            />
            <input
              type="text"
              required
              autoComplete="organization"
              placeholder={t("proposalFieldCompany")}
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full min-h-[44px] p-4 border border-input rounded-lg bg-transparent text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-electric outline-none"
            />
            {/* WhatsApp input with +60 prefix (number stored without + or leading 0) */}
            <div className="flex">
              <span className="inline-flex items-center px-4 bg-muted border border-r-0 border-input rounded-l-lg text-muted-foreground font-medium select-none">
                +60
              </span>
              <input
                type="tel"
                required
                autoComplete="tel-national"
                placeholder="11-5403 4051"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full min-h-[44px] p-4 border border-input rounded-r-lg bg-transparent text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-electric outline-none"
              />
            </div>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder={t("proposalFieldEmail")}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full min-h-[44px] p-4 border border-input rounded-lg bg-transparent text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-electric outline-none"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[44px] py-4 bg-navy dark:bg-electric dark:text-navy text-white font-heading font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("proposalSubmit")}
            </button>
          </form>
        </div>
      )}

      {/* Step 4: Success state */}
      {step === 4 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-electric rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle2 className="w-8 h-8 text-navy" aria-hidden="true" />
          </div>
          <h3 className="text-2xl font-heading font-bold text-card-foreground mb-2">
            {t("proposalSuccessTitle")}
          </h3>
          <p className="text-muted-foreground mb-6">
            {t("proposalSuccessDesc").replace("{name}", formData.name)}
          </p>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center px-8 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors"
          >
            {t("proposalOpenWhatsapp")}
          </a>
        </div>
      )}
    </div>
  )
}
