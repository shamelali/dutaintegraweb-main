import { Link } from "react-router-dom"
import { useLanguage } from "@/hooks/use-language"
import type { TranslationKey } from "@/i18n/translations"

const companyLinks = [
  { key: "navAbout" as TranslationKey, to: "/about" },
  { key: "navPricing" as TranslationKey, to: "/pricing" },
  { key: "navContact" as TranslationKey, to: "/contact" },
  { key: "idxFooterStats" as TranslationKey, to: "/stats" },
  { key: "idxFooterInsights" as TranslationKey, to: "/insights" },
]

const serviceLinks = [
  { key: "idxFooterAiDev" as TranslationKey, to: "/services" },
  { key: "idxFooterManagedIt" as TranslationKey, to: "/services" },
  { key: "idxFooterCloudMig" as TranslationKey, to: "/services" },
  { key: "idxFooterItSec" as TranslationKey, to: "/services" },
]

export function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="bg-navy text-white/60 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 font-heading font-bold text-lg text-white mb-4">
              <span className="text-electric">⚡</span>
              Duta Integra
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              {t("idxFooterDesc")}
            </p>
          </div>

          {/* Company */}
          <div>
            <h5 className="text-xs uppercase tracking-widest text-white/40 font-semibold mb-4">
              {t("idxFooterCompany")}
            </h5>
            <ul className="space-y-2">
              {companyLinks.map((link) => (
                <li key={link.to + link.key}>
                  <Link
                    to={link.to}
                    className="text-sm hover:text-electric transition-colors"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h5 className="text-xs uppercase tracking-widest text-white/40 font-semibold mb-4">
              {t("idxFooterServices")}
            </h5>
            <ul className="space-y-2">
              {serviceLinks.map((link, i) => (
                <li key={i}>
                  <Link
                    to={link.to}
                    className="text-sm hover:text-electric transition-colors"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-white/30">
            {t("idxFooterCopy")}
          </p>
          <p className="text-xs text-white/30">
            info@dutaintegra.my · +60 11-5403 4051
          </p>
        </div>
      </div>
    </footer>
  )
}
