import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Bot, Monitor, Cloud, Shield, BarChart3, Target, Zap, Timer, Flag, ArrowRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/hooks/use-language"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"
import type { TranslationKey } from "@/i18n/translations"

const services = [
  { icon: Bot, titleKey: "idxSvc1Title" as TranslationKey, descKey: "idxSvc1Desc" as TranslationKey, to: "/services" },
  { icon: Monitor, titleKey: "idxSvc2Title" as TranslationKey, descKey: "idxSvc2Desc" as TranslationKey, to: "/services" },
  { icon: Cloud, titleKey: "idxSvc3Title" as TranslationKey, descKey: "idxSvc3Desc" as TranslationKey, to: "/services" },
  { icon: Shield, titleKey: "idxSvc4Title" as TranslationKey, descKey: "idxSvc4Desc" as TranslationKey, to: "/services" },
]

const whyItems = [
  { num: "01", icon: Target, titleKey: "idxWhy1Title" as TranslationKey, descKey: "idxWhy1Desc" as TranslationKey },
  { num: "02", icon: Zap, titleKey: "idxWhy2Title" as TranslationKey, descKey: "idxWhy2Desc" as TranslationKey },
  { num: "03", icon: Timer, titleKey: "idxWhy3Title" as TranslationKey, descKey: "idxWhy3Desc" as TranslationKey },
  { num: "04", icon: Flag, titleKey: "idxWhy4Title" as TranslationKey, descKey: "idxWhy4Desc" as TranslationKey },
]

// Pain-led hero variants for A/B testing
const heroVariants = [
  {
    badgeKey: "convBadgeA" as TranslationKey,
    titleKey: "convHeroATitle" as TranslationKey,
    highlightKey: "convHeroAHighlight" as TranslationKey,
    descKey: "convHeroADesc" as TranslationKey,
    ctaKey: "convHeroACta" as TranslationKey,
  },
  {
    badgeKey: "convBadgeB" as TranslationKey,
    titleKey: "convHeroBTitle" as TranslationKey,
    highlightKey: "convHeroBHighlight" as TranslationKey,
    descKey: "convHeroBDesc" as TranslationKey,
    ctaKey: "convHeroBCta" as TranslationKey,
  },
]

export function HomePage() {
  const { t } = useLanguage()
  const heroRef = useScrollReveal()
  const servicesRef = useScrollReveal()
  const whyRef = useScrollReveal()
  const trustRef = useScrollReveal()

  // A/B test: 50/50 split
  const [variant] = useState(() => (Math.random() < 0.5 ? 0 : 1))
  const hero = heroVariants[variant]

  // WhatsApp signup
  const [waName, setWaName] = useState("")
  const [waPhone, setWaPhone] = useState("")
  const [waSubmitted, setWaSubmitted] = useState(false)

  // Sticky CTA visibility
  const [showSticky, setShowSticky] = useState(false)
  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 600)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const handleWaSignup = async () => {
    if (!waPhone) return
    try {
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: waName || "WhatsApp Lead",
          phone: waPhone,
          source: "hero-whatsapp-signup",
        }),
      })
    } catch {}
    setWaSubmitted(true)
  }

  return (
    <>
      {/* Hero — Pain-led A/B test */}
      <section ref={heroRef} className="relative overflow-hidden bg-gradient-to-br from-navy via-slate-deep to-navy py-24 md:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(0,212,255,0.08),transparent_50%)]" />
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <Badge variant="electric" className="mb-6 reveal">
            {t(hero.badgeKey)}
          </Badge>

          <h1 className="text-4xl md:text-6xl font-heading font-bold text-white mb-6 reveal reveal-delay-1">
            {t(hero.titleKey)}
            <br />
            <span className="text-electric">{t(hero.highlightKey)}</span>
          </h1>

          <p className="text-lg text-white/60 max-w-2xl mx-auto mb-8 reveal reveal-delay-2">
            {t(hero.descKey)}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 reveal reveal-delay-3">
            <Button asChild variant="electric" size="xl">
              <Link to="/quiz">
                <span className="flex items-center gap-2">
                  {t(hero.ctaKey)}
                  <ArrowRight className="w-5 h-5" />
                </span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl" className="border-white/20 text-white hover:bg-white/10">
              <Link to="/services">{t("idxHeroBtn2")}</Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto reveal reveal-delay-4">
            {[
              { val: "3", labelKey: "convStat1" as TranslationKey },
              { val: "RM 240K+", labelKey: "convStat2" as TranslationKey },
              { val: "24/7", labelKey: "convStat3" as TranslationKey },
              { val: "100%", labelKey: "idxStat4Label" as TranslationKey },
            ].map((stat) => (
              <div key={stat.labelKey} className="text-center">
                <div className="text-3xl font-bold text-electric">{stat.val}</div>
                <div className="text-xs text-white/40 mt-1">{t(stat.labelKey)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section ref={servicesRef} className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 reveal">{t("idxSvcEyebrow")}</Badge>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4 reveal reveal-delay-1">
              {t("idxSvcTitle")}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto reveal reveal-delay-2">
              {t("idxSvcSub")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {services.map((svc, i) => (
              <Card key={svc.titleKey} className={`group p-8 hover:shadow-lg hover:border-electric/30 transition-all reveal reveal-delay-${i + 1}`}>
                <Link to={svc.to} className="block">
                  <div className="w-12 h-12 rounded-lg bg-electric/10 flex items-center justify-center mb-4 group-hover:bg-electric/20 transition-colors">
                    <svc.icon className="w-6 h-6 text-electric" />
                  </div>
                  <h3 className="text-xl font-heading font-semibold mb-2">{t(svc.titleKey)}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{t(svc.descKey)}</p>
                  <span className="text-electric text-sm font-medium">{t("idxLearnMore")}</span>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section ref={whyRef} className="py-24 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 reveal">{t("idxWhyEyebrow")}</Badge>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground reveal reveal-delay-1">
              {t("idxWhyTitle")}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {whyItems.map((item, i) => (
              <Card key={item.titleKey} className={`p-8 reveal reveal-delay-${i + 1}`}>
                <div className="flex items-start gap-4">
                  <span className="text-3xl font-bold text-electric/20 font-heading">{item.num}</span>
                  <div>
                    <h3 className="text-lg font-heading font-semibold mb-2">{t(item.titleKey)}</h3>
                    <p className="text-muted-foreground text-sm">{t(item.descKey)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Band */}
      <section ref={trustRef} className="py-16 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8 text-center reveal">
          <div>
            <div className="text-4xl font-bold text-electric mb-1">RM 240K+</div>
            <div className="text-sm text-muted-foreground">{t("convTrust1")}</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-electric mb-1">3 days</div>
            <div className="text-sm text-muted-foreground">{t("convTrust2")}</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-electric mb-1">0</div>
            <div className="text-sm text-muted-foreground">{t("convTrust3")}</div>
          </div>
        </div>
      </section>

      {/* WhatsApp One-Field Signup */}
      <section className="py-24 px-6 bg-gradient-to-br from-navy to-slate-deep">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4 reveal">
            {t("convWaTitle")}
          </h2>
          <p className="text-white/60 mb-8 reveal reveal-delay-1">{t("convWaDesc")}</p>

          {!waSubmitted ? (
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 max-w-md mx-auto reveal reveal-delay-2">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="space-y-1">
                  <Label htmlFor="wa-name" className="text-white/60 text-xs">{t("convWaName")}</Label>
                  <Input
                    id="wa-name"
                    value={waName}
                    onChange={(e) => setWaName(e.target.value)}
                    placeholder="Ahmad"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="wa-phone" className="text-white/60 text-xs">{t("convWaPhone")} *</Label>
                  <Input
                    id="wa-phone"
                    type="tel"
                    value={waPhone}
                    onChange={(e) => setWaPhone(e.target.value)}
                    placeholder="012 345 6789"
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
                  />
                </div>
              </div>
              <Button
                variant="electric"
                className="w-full"
                onClick={handleWaSignup}
                disabled={!waPhone}
              >
                {t("convWaCta")}
              </Button>
            </div>
          ) : (
            <div className="bg-electric/10 rounded-2xl p-6 max-w-md mx-auto reveal">
              <p className="font-medium text-white mb-2">{t("convWaThanks")}</p>
              <a
                href="https://wa.me/601154034051?text=Hi%20Duta%20Integra!%20I%27m%20interested%20in%20your%20services."
                target="_blank"
                rel="noopener noreferrer"
                className="text-electric font-semibold text-sm hover:underline"
              >
                {t("convWaLink")}
              </a>
            </div>
          )}
        </div>
      </section>

      {/* CTA Band */}
      <section className="py-24 px-6 bg-gradient-to-br from-navy to-slate-deep text-center border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">
            {t("idxCtaTitle")}
          </h2>
          <p className="text-white/60 mb-8">
            {t("idxCtaDesc")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild variant="electric" size="xl">
              <Link to="/contact">{t("idxCtaBtn1")}</Link>
            </Button>
            <Button asChild variant="outline" size="xl" className="border-white/20 text-white hover:bg-white/10">
              <Link to="/pricing">{t("idxCtaBtn2")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Sticky CTA Bar */}
      {showSticky && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-navy/95 backdrop-blur-md border-t border-white/10 py-3 px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="hidden sm:block">
              <p className="text-sm text-white font-medium">{t("convStickyTitle")}</p>
              <p className="text-xs text-white/40">{t("convStickySub")}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button asChild variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                <a href="https://wa.me/601154034051" target="_blank" rel="noopener noreferrer">
                  {t("convStickyWa")}
                </a>
              </Button>
              <Button asChild variant="electric" size="sm">
                <Link to="/quiz">{t("convStickyCta")}</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
