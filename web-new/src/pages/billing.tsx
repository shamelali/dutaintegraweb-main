import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Link } from "react-router-dom"
import { AlertCircle, CreditCard, LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DutaosAccountBar } from "@/components/dutaos-account-bar"
import { useLanguage } from "@/hooks/use-language"

type Company = {
  id: string
  name: string
  email: string
  subscriptionTier: string
  subscriptionStatus: string
}

const PLAN_LABELS: Record<string, { en: string; bm: string }> = {
  starter: { en: "Starter", bm: "Permulaan" },
  growth: { en: "Growth", bm: "Pertumbuhan" },
}

const PLAN_PRICE: Record<string, string> = {
  starter: "RM 799",
  growth: "RM 1,899",
}

export function BillingPage() {
  const navigate = useNavigate()
  const { t, lang } = useLanguage()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch("/api/companies", { credentials: "same-origin" })
        if (res.status === 401) {
          if (active) navigate(`/signin?next=${encodeURIComponent(window.location.pathname)}`)
          return
        }
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to load")
        if (active) setCompany((data.company as Company) ?? null)
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load your subscription.")
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [navigate])

  const isActive = company?.subscriptionStatus === "active"
  const tier = company?.subscriptionTier ?? "starter"
  const plan = PLAN_LABELS[tier] ?? { en: tier, bm: tier }
  const price = PLAN_PRICE[tier] ?? "Custom"

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoaderCircle className="animate-spin h-8 w-8" /></div>
  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="p-8 max-w-md text-center">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <p className="text-destructive">{error}</p>
      </Card>
    </div>
  )
  if (!company) return null

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <DutaosAccountBar />
        <div className="mb-10">
          <h1 className="text-3xl font-heading font-bold">{t("billingPageTitle")}</h1>
          <p className="text-muted-foreground">{t("billingPageSub")}</p>
        </div>

        <Card className="p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <p className="text-sm text-muted-foreground">{t("billingCurrentPlan")}</p>
              <h2 className="text-3xl font-heading font-bold">{plan[lang]}</h2>
              <p className="text-muted-foreground">
                {price} {t("billingPricePerMonth")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium border ${
                  isActive
                    ? "border-emerald/50 bg-emerald/50 text-emerald-700"
                    : "border-amber/50 bg-amber/50 text-amber-700"
                }`}
              >
                {isActive ? t("billingStatusActive") : t("billingStatusInactive")}
              </span>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Button asChild variant="electric" className="w-full sm:w-auto">
              <Link to="/contact">
                <CreditCard className="w-4 h-4 mr-2" /> {t("billingSubscribe")}
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/contact">{t("billingUpgrade")}</Link>
            </Button>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">{t("billingComingSoon")}</p>
        </Card>
      </div>
    </div>
  )
}
