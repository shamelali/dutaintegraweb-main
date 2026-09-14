import { Link } from "react-router-dom"
import { Target, Handshake, Zap, Flag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/hooks/use-language"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"
import type { TranslationKey } from "@/i18n/translations"

const values = [
  { icon: Target, titleKey: "aboutVal1Title" as TranslationKey, descKey: "aboutVal1Desc" as TranslationKey },
  { icon: Handshake, titleKey: "aboutVal2Title" as TranslationKey, descKey: "aboutVal2Desc" as TranslationKey },
  { icon: Zap, titleKey: "aboutVal3Title" as TranslationKey, descKey: "aboutVal3Desc" as TranslationKey },
  { icon: Flag, titleKey: "aboutVal4Title" as TranslationKey, descKey: "aboutVal4Desc" as TranslationKey },
]

const stats = [
  { val: "2026", labelKey: "aboutFounded" as TranslationKey },
  { val: "100%", labelKey: "aboutOwned" as TranslationKey },
  { val: "AI + IT", labelKey: "aboutDual" as TranslationKey },
  { val: "2+", labelKey: "aboutClients" as TranslationKey },
]

export function AboutPage() {
  const { t } = useLanguage()
  const heroRef = useScrollReveal()
  const storyRef = useScrollReveal()
  const valuesRef = useScrollReveal()
  const founderRef = useScrollReveal()
  const ctaRef = useScrollReveal()

  return (
    <>
      {/* Hero */}
      <section ref={heroRef} className="py-24 md:py-32 bg-gradient-to-br from-navy via-slate-deep to-navy text-center">
        <div className="max-w-4xl mx-auto px-6">
          <Badge variant="electric" className="mb-6 reveal">{t("aboutHeroLabel")}</Badge>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6 reveal reveal-delay-1">
            {t("aboutHeroTitle")}
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto reveal reveal-delay-2">
            {t("aboutHeroDesc")}
          </p>
        </div>
      </section>

      {/* Story + Stats */}
      <section ref={storyRef} className="py-24 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl font-heading font-bold mb-6 reveal">{t("aboutStoryTitle")}</h2>
            <div className="space-y-4 text-muted-foreground reveal reveal-delay-1">
              <p>{t("aboutStory1")}</p>
              <p>{t("aboutStory2")}</p>
              <p>{t("aboutStory3")}</p>
              <p>{t("aboutStory4")}</p>
            </div>
            <Button asChild variant="electric" className="mt-8 reveal reveal-delay-2">
              <Link to="/contact">{t("aboutWorkBtn")}</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 reveal reveal-delay-2">
            {stats.map((stat) => (
              <Card key={stat.labelKey} className="p-6 text-center">
                <div className="text-3xl font-bold text-electric mb-2">{stat.val}</div>
                <div className="text-sm text-muted-foreground">{t(stat.labelKey)}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section ref={valuesRef} className="py-24 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 reveal">{t("aboutValuesEyebrow")}</Badge>
            <h2 className="text-3xl md:text-4xl font-heading font-bold reveal reveal-delay-1">
              {t("aboutValuesTitle")}
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {values.map((v, i) => (
              <Card key={v.titleKey} className={`p-8 reveal reveal-delay-${i + 1}`}>
                <div className="w-12 h-12 rounded-lg bg-electric/10 flex items-center justify-center mb-4">
                  <v.icon className="w-6 h-6 text-electric" />
                </div>
                <h3 className="text-xl font-heading font-semibold mb-2">{t(v.titleKey)}</h3>
                <p className="text-muted-foreground text-sm">{t(v.descKey)}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Founder */}
      <section ref={founderRef} className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 reveal">{t("aboutFounderEyebrow")}</Badge>
            <h2 className="text-3xl md:text-4xl font-heading font-bold reveal reveal-delay-1">
              {t("aboutFounderTitle")}
            </h2>
          </div>
          <Card className="p-8 md:p-12 reveal reveal-delay-2">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-full bg-electric/10 flex items-center justify-center shrink-0">
                <span className="text-2xl font-bold text-electric">S</span>
              </div>
              <div>
                <h3 className="text-2xl font-heading font-bold">Shamel</h3>
                <p className="text-electric text-sm mb-4">{t("aboutFounderRole")}</p>
                <div className="space-y-4 text-muted-foreground">
                  <p>{t("aboutFounderP1")}</p>
                  <p>{t("aboutFounderP2")}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section ref={ctaRef} className="py-24 px-6 bg-gradient-to-br from-navy to-slate-deep text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4 reveal">
            {t("aboutCtaTitle")}
          </h2>
          <p className="text-white/60 mb-8 reveal reveal-delay-1">{t("aboutCtaDesc")}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 reveal reveal-delay-2">
            <Button asChild variant="electric" size="xl">
              <Link to="/contact">{t("aboutCtaBtn1")}</Link>
            </Button>
            <Button asChild variant="outline" size="xl" className="border-white/20 text-white hover:bg-white/10">
              <Link to="/services">{t("aboutCtaBtn2")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
