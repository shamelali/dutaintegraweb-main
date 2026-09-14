import { Link } from "react-router-dom"
import { Bot, Monitor, Cloud, Shield, BarChart3, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/hooks/use-language"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"
import type { TranslationKey } from "@/i18n/translations"

const services = [
  {
    icon: Bot,
    titleKey: "svc1Title" as TranslationKey,
    descKey: "svc1Desc" as TranslationKey,
    features: ["svc1Feat1", "svc1Feat2", "svc1Feat3", "svc1Feat4", "svc1Feat5", "svc1Feat6"] as TranslationKey[],
  },
  {
    icon: Monitor,
    titleKey: "svc2Title" as TranslationKey,
    descKey: "svc2Desc" as TranslationKey,
    features: ["svc2Feat1", "svc2Feat2", "svc2Feat3", "svc2Feat4", "svc2Feat5", "svc2Feat6"] as TranslationKey[],
  },
  {
    icon: Cloud,
    titleKey: "svc3Title" as TranslationKey,
    descKey: "svc3Desc" as TranslationKey,
    features: ["svc3Feat1", "svc3Feat2", "svc3Feat3", "svc3Feat4", "svc3Feat5", "svc3Feat6"] as TranslationKey[],
  },
  {
    icon: Shield,
    titleKey: "svc4Title" as TranslationKey,
    descKey: "svc4Desc" as TranslationKey,
    features: ["svc4Feat1", "svc4Feat2", "svc4Feat3", "svc4Feat4", "svc4Feat5", "svc4Feat6"] as TranslationKey[],
  },
  {
    icon: BarChart3,
    titleKey: "svc5Title" as TranslationKey,
    descKey: "svc5Desc" as TranslationKey,
    features: ["svc5Feat1", "svc5Feat2", "svc5Feat3", "svc5Feat4", "svc5Feat5", "svc5Feat6"] as TranslationKey[],
  },
]

const steps = [
  { num: 1, titleKey: "svcStep1Title" as TranslationKey, descKey: "svcStep1Desc" as TranslationKey },
  { num: 2, titleKey: "svcStep2Title" as TranslationKey, descKey: "svcStep2Desc" as TranslationKey },
  { num: 3, titleKey: "svcStep3Title" as TranslationKey, descKey: "svcStep3Desc" as TranslationKey },
  { num: 4, titleKey: "svcStep4Title" as TranslationKey, descKey: "svcStep4Desc" as TranslationKey },
]

export function ServicesPage() {
  const { t } = useLanguage()
  const heroRef = useScrollReveal()
  const gridRef = useScrollReveal()
  const processRef = useScrollReveal()
  const ctaRef = useScrollReveal()

  return (
    <>
      {/* Hero */}
      <section ref={heroRef} className="py-24 md:py-32 bg-gradient-to-br from-navy via-slate-deep to-navy text-center">
        <div className="max-w-4xl mx-auto px-6">
          <Badge variant="electric" className="mb-6 reveal">{t("svcHeroLabel")}</Badge>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6 reveal reveal-delay-1">
            {t("svcHeroTitle")}
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto reveal reveal-delay-2">
            {t("svcHeroDesc")}
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section ref={gridRef} className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 reveal">{t("svcCoreEyebrow")}</Badge>
            <h2 className="text-3xl md:text-4xl font-heading font-bold reveal reveal-delay-1">
              {t("svcCoreTitle")}
            </h2>
          </div>

          <div className="space-y-8">
            {services.map((svc, i) => (
              <Card key={svc.titleKey} className={`p-8 md:p-12 reveal reveal-delay-${Math.min(i + 1, 4)}`}>
                <div className="grid md:grid-cols-[1fr_2fr] gap-8">
                  <div>
                    <div className="w-14 h-14 rounded-xl bg-electric/10 flex items-center justify-center mb-4">
                      <svc.icon className="w-7 h-7 text-electric" />
                    </div>
                    <h3 className="text-2xl font-heading font-bold mb-3">{t(svc.titleKey)}</h3>
                    <p className="text-muted-foreground mb-6">{t(svc.descKey)}</p>
                    <div className="flex gap-3">
                      <Button asChild variant="electric" size="sm">
                        <Link to="/contact">{t("svcGetQuote")}</Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link to="/pricing">{t("svcGetNotified")}</Link>
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {svc.features.map((feat) => (
                      <div key={feat} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-electric mt-0.5 shrink-0" />
                        <span className="text-sm text-muted-foreground">{t(feat)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section ref={processRef} className="py-24 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 reveal">{t("svcProcessEyebrow")}</Badge>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4 reveal reveal-delay-1">
              {t("svcProcessTitle")}
            </h2>
            <p className="text-muted-foreground reveal reveal-delay-2">{t("svcProcessSub")}</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <Card key={step.titleKey} className={`p-6 text-center reveal reveal-delay-${i + 1}`}>
                <div className="w-10 h-10 rounded-full bg-electric/10 text-electric font-bold flex items-center justify-center mx-auto mb-4">
                  {step.num}
                </div>
                <h4 className="font-heading font-semibold mb-2">{t(step.titleKey)}</h4>
                <p className="text-sm text-muted-foreground">{t(step.descKey)}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section ref={ctaRef} className="py-24 px-6 bg-gradient-to-br from-navy to-slate-deep text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4 reveal">
            {t("svcCtaTitle")}
          </h2>
          <p className="text-white/60 mb-8 reveal reveal-delay-1">{t("svcCtaDesc")}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 reveal reveal-delay-2">
            <Button asChild variant="electric" size="xl">
              <Link to="/contact">{t("svcCtaBtn1")}</Link>
            </Button>
            <Button asChild variant="outline" size="xl" className="border-white/20 text-white hover:bg-white/10">
              <Link to="/pricing">{t("svcCtaBtn2")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
