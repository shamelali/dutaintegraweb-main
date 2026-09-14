import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Moon, Sun, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDarkMode } from "@/hooks/use-dark-mode"
import { useLanguage } from "@/hooks/use-language"
import type { TranslationKey } from "@/i18n/translations"

const navLinks = [
  { key: "navServices" as TranslationKey, to: "/services" },
  { key: "navAbout" as TranslationKey, to: "/about" },
  { key: "navPricing" as TranslationKey, to: "/pricing" },
  { key: "navQuiz" as TranslationKey, to: "/quiz", highlight: true },
  { key: "navContact" as TranslationKey, to: "/contact", cta: true },
]

export function Navbar() {
  const { isDark, toggle: toggleDark } = useDarkMode()
  const { lang, toggle: toggleLang, t } = useLanguage()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-heading font-bold text-lg text-foreground">
          <span className="text-electric">⚡</span>
          Duta Integra
        </Link>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? "bg-accent/10 text-electric"
                    : link.highlight
                    ? "text-electric hover:bg-electric/10"
                    : link.cta
                    ? "bg-navy text-white hover:bg-navy/90 dark:bg-electric dark:text-navy"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {t(link.key)}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDark}
            className="hidden md:flex"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLang}
            className="hidden md:flex font-semibold"
          >
            {lang === "en" ? "BM" : "EN"}
          </Button>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-6 py-4 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname === link.to
                  ? "bg-accent/10 text-electric"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(link.key)}
            </Link>
          ))}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Button variant="ghost" size="icon" onClick={toggleDark}>
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={toggleLang} className="font-semibold">
              {lang === "en" ? "BM" : "EN"}
            </Button>
          </div>
        </div>
      )}
    </nav>
  )
}
