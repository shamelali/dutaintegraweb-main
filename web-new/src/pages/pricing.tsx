import { Link } from "react-router-dom"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/hooks/use-language"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"
import type { TranslationKey } from "@/i18n/translations"

const tiers = [
  {
    nameKey: "priceTier1Name" as TranslationKey,
    tagKey: "priceTier1Tag" as TranslationKey,
    price: "RM 799",
    period: "/ month",
    features: [
      { key: "priceTier1F1" as TranslationKey, included: true },
      { key: "priceTier1F2" as TranslationKey, included: true },
      { key: "priceTier1F3" as TranslationKey, included: true },
      { key: "priceTier1F4" as TranslationKey, included: true },
      { key: "priceTier1F5" as TranslationKey, included: true },
      { key: "priceTier1Na1" as TranslationKey, included: false },
      { key: "priceTier1Na2" as TranslationKey, included: false },
      { key: "priceTier1Na3" as TranslationKey, included: false },
    ],
    ctaKey: "priceGetStarted" as TranslationKey,
    featured: false,
  },
  {
    nameKey: "priceTier2Name" as TranslationKey,
    tagKey: "priceTier2Tag" as TranslationKey,
    price: "RM 1,899",
    period: "/ month",
    badgeKey: "priceBadge" as TranslationKey,
    features: [
      { key: "priceTier2F1" as TranslationKey, included: true },
      { key: "priceTier2F2" as TranslationKey, included: true },
      { key: "priceTier2F3" as TranslationKey, included: true },
      { key: "priceTier2F4" as TranslationKey, included: true },
      { key: "priceTier2F5" as TranslationKey, included: true },
      { key: "priceTier2F6" as TranslationKey, included: true },
      { key: "priceTier2F7" as TranslationKey, included: true },
      { key: "priceTier2Na1" as TranslationKey, included: false },
    ],
    ctaKey: "priceGetStarted" as TranslationKey,
    featured: true,
  },
  {
    nameKey: "priceTier3Name" as TranslationKey,
    tagKey: "priceTier3Tag" as TranslationKey,
    price: "Custom",
    period: "/ month",
    features: [
      { key: "priceTier3F1" as TranslationKey, included: true },
      { key: "priceTier3F2" as TranslationKey, included: true },
      { key: "priceTier3F3" as TranslationKey, included: true },
      { key: "priceTier3F4" as TranslationKey, included: true },
      { key: "priceTier3F5" as TranslationKey, included: true },
      { key: "priceTier3F6" as TranslationKey, included: true },
      { key: "priceTier3F7" as TranslationKey, included: true },
      { key: "priceTier3F8" as TranslationKey, included: true },
    ],
    ctaKey: "priceRequestQuote" as TranslationKey,
    featured: false,
  },
]

const addons = [
  { titleKey: "priceAddon1Title" as TranslationKey, descKey: "priceAddon1Desc" as TranslationKey, price: "From RM 3,500" },
  { titleKey: "priceAddon2Title" as TranslationKey, descKey: "priceAddon2Desc" as TranslationKey, price: "From RM 5,000" },
  { titleKey: "priceAddon3Title" as TranslationKey, descKey: "priceAddon3Desc" as TranslationKey, price: "From RM 8,000" },
  { titleKey: "priceAddon4Title" as TranslationKey, descKey: "priceAddon4Desc" as TranslationKey, price: "From RM 2,500" },
  { titleKey: "priceAddon5Title" as TranslationKey, descKey: "priceAddon5Desc" as TranslationKey, price: "From RM 4,000" },
  { titleKey: "priceAddon6Title" as TranslationKey, descKey: "priceAddon6Desc" as TranslationKey, price: "From RM 1,800" },
]

export function PricingPage() {
  const { t } = useLanguage()
  const heroRef = useScrollReveal()
  const tiersRef = useScrollReveal()
  const addonsRef = useScrollReveal()
  const ctaRef = useScrollReveal()

  return (
    <>
      {/* Hero */}
      <section ref={heroRef} className="py-24 md:py-32 bg-gradient-to-br from-navy via-slate-deep to-navy text-center">
        <div className="max-w-4xl mx-auto px-6">
          <Badge variant="electric" className="mb-6 reveal">{t("priceHeroLabel")}</Badge>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6 reveal reveal-delay-1">
            {t("priceHeroTitle")}
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto reveal reveal-delay-2">
            {t("priceHeroDesc")}
          </p>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section ref={tiersRef} className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 reveal">{t("priceManagedEyebrow")}</Badge>
            <h2 className="text-3xl md:text-4xl font-heading font-bold reveal reveal-delay-1">
              {t("priceManagedTitle")}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {tiers.map((tier, i) => (
              <Card
                key={tier.nameKey}
                className={`relative p-8 ${
                  tier.featured
                    ? "border-electric shadow-lg shadow-electric/10"
                    : ""
                } reveal reveal-delay-${i + 1}`}
              >
                {tier.badgeKey && (
                  <Badge variant="electric" className="absolute -top-3 left-1/2 -translate-x-1/2">
                    {t(tier.badgeKey)}
                  </Badge>
                )}
                <h3 className="text-xl font-heading font-bold mb-1">{t(tier.nameKey)}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t(tier.tagKey)}</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold">{tier.price}</span>
                  <span className="text-muted-foreground text-sm">{tier.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((f) => (
                    <li key={f.key} className="flex items-start gap-2 text-sm">
                      {f.included ? (
                        <Check className="w-4 h-4 text-electric mt-0.5 shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                      )}
                      <span className={f.included ? "" : "text-muted-foreground/40"}>
                        {t(f.key)}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  variant={tier.featured ? "electric" : "outline"}
                  className="w-full"
                >
                  <Link to="/contact">{t(tier.ctaKey)}</Link>
                </Button>
              </Card>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground reveal">
            <span className="font-medium">{t("priceNoteHighlight")}</span>. {t("priceNoteNoLock")}
          </p>
        </div>
      </section>

      {/* AI Addons */}
      <section ref={addonsRef} className="py-24 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 reveal">{t("priceAddonEyebrow")}</Badge>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4 reveal reveal-delay-1">
              {t("priceAddonTitle")}
            </h2>
            <p className="text-muted-foreground reveal reveal-delay-2">{t("priceAddonSub")}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {addons.map((addon, i) => (
              <Card key={addon.titleKey} className={`p-6 reveal reveal-delay-${Math.min(i + 1, 4)}`}>
                <h4 className="font-heading font-semibold mb-1">{t(addon.titleKey)}</h4>
                <p className="text-electric text-sm font-medium mb-2">{addon.price}</p>
                <p className="text-sm text-muted-foreground">{t(addon.descKey)}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section ref={ctaRef} className="py-24 px-6 bg-gradient-to-br from-navy to-slate-deep text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4 reveal">
            {t("priceCtaTitle")}
          </h2>
          <p className="text-white/60 mb-8 reveal reveal-delay-1">{t("priceCtaDesc")}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 reveal reveal-delay-2">
            <Button asChild variant="electric" size="xl">
              <Link to="/contact">{t("priceCtaBtn1")}</Link>
            </Button>
            <Button asChild variant="outline" size="xl" className="border-white/20 text-white hover:bg-white/10">
              <Link to="/services">{t("priceCtaBtn2")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
