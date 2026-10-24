import { Check, MessageCircle } from "lucide-react"
import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { dutaosPlans, waLink } from "@/lib/dutaos"
import { useLanguage } from "@/hooks/use-language"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

interface DutaosModulesSectionProps {
  /** DOM id so hero CTAs can anchor to it (e.g. "#modules"). */
  id?: string
}

/**
 * DutaOS modular pricing — shared by the home page and the pricing page.
 * One product, three modules, one bundle. CTAs deep-link to WhatsApp with
 * the plan name prefilled so leads arrive pre-qualified.
 */
export function DutaosModulesSection({ id }: DutaosModulesSectionProps) {
  const { t } = useLanguage()
  const headRef = useScrollReveal()
  const gridRef = useScrollReveal()

  return (
    <section id={id} className="py-20 px-6 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div ref={headRef} className="text-center mb-16">
          <Badge variant="electric" className="mb-4 reveal">{t("dutaosModulesEyebrow")}</Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4 reveal reveal-delay-1">
            {t("dutaosModulesTitle")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto reveal reveal-delay-2">
            {t("dutaosModulesSub")}
          </p>
        </div>

        <div ref={gridRef} className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
          {dutaosPlans.map((plan, i) => (
            <Card
              key={plan.nameKey}
              className={`relative flex flex-col p-6 ${
                plan.featured ? "border-electric shadow-lg shadow-electric/10" : ""
              } reveal reveal-delay-${i + 1}`}
            >
              {plan.featured && (
                <Badge variant="electric" className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  {t("dutaosSaveBadge")}
                </Badge>
              )}
              <h3 className="text-lg font-heading font-bold mb-1">{t(plan.nameKey)}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t(plan.tagKey)}</p>
              <div className="mb-6">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">{t("dutaosFrom")} </span>
                <span className="text-3xl font-bold">RM {plan.price}</span>
                <span className="text-muted-foreground text-sm">{t("dutaosPerMonth")}</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.featureKeys.map((key) => (
                  <li key={key} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-electric mt-0.5 shrink-0" />
                    <span>{t(key)}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant={plan.featured ? "electric" : "outline"} className="w-full">
                <a
                  href={waLink(t("dutaosPlanWaMsg").replace("{plan}", t(plan.nameKey)))}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {t("dutaosPlanCta")}
                </a>
              </Button>
            </Card>
          ))}
        </div>

        <p className="text-center mt-8 reveal">
          <Link to="/contact" className="text-electric font-medium text-sm hover:underline">
            {t("dutaosCustomQuote")}
          </Link>
        </p>
      </div>
    </section>
  )
}
