import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
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

type Payment = {
  id: string
  companyId: string
  provider: string
  amount: number
  currency: string
  status: string
  providerPaymentId: string | null
  checkoutUrl: string | null
  plan: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

type Plan = "starter" | "growth"
type Provider = "hitpay" | "billplz"

const PLAN_LABELS: Record<string, { en: string; bm: string }> = {
  starter: { en: "Starter", bm: "Permulaan" },
  growth: { en: "Growth", bm: "Pertumbuhan" },
}

const PLAN_PRICE: Record<string, string> = {
  starter: "RM 799",
  growth: "RM 1,899",
}

const PROVIDER_LABELS: Record<string, { en: string; bm: string }> = {
  hitpay: { en: "HitPay", bm: "HitPay" },
  billplz: { en: "Billplz", bm: "Billplz" },
}

export function BillingPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { t, lang } = useLanguage()
  const [company, setCompany] = useState<Company | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [provider, setProvider] = useState<Provider>("hitpay")
  const [plan, setPlan] = useState<Plan>("starter")

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

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch("/api/billing/payments", { credentials: "same-origin" })
        if (!res.ok) throw new Error("Failed to load payment history")
        const data = await res.json()
        if (active) setPayments((data.payments as Payment[]) ?? [])
      } catch {
        // Payment history is a nicety; a missing history list must not block the page.
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const paymentStatus = params.get("payment")
  const flashMessage =
    paymentStatus === "success"
      ? t("billingPaymentSuccess")
      : paymentStatus === "cancelled"
        ? t("billingPaymentCancelled")
        : null

  const isActive = company?.subscriptionStatus === "active"
  const tier = company?.subscriptionTier ?? "starter"
  const planLabel = PLAN_LABELS[tier] ?? { en: tier, bm: tier }
  const price = PLAN_PRICE[tier] ?? "Custom"
  const selectedPrice = PLAN_PRICE[plan]

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setCheckoutLoading(true)
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ provider, plan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Checkout failed")
      window.location.assign(data.checkoutUrl as string)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed")
    } finally {
      setCheckoutLoading(false)
    }
  }

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

        {flashMessage && (
          <Card className="mb-6 p-4 border-emerald/50 bg-emerald/50">
            <p className="text-emerald-700">{flashMessage}</p>
          </Card>
        )}

        <Card className="p-8 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <p className="text-sm text-muted-foreground">{t("billingCurrentPlan")}</p>
              <h2 className="text-3xl font-heading font-bold">{planLabel[lang]}</h2>
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

          <form onSubmit={handleCheckout} className="mt-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  {t("billingPayWith")}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="provider-hitpay"
                    type="radio"
                    name="provider"
                    value="hitpay"
                    checked={provider === "hitpay"}
                    onChange={() => setProvider("hitpay")}
                    className="h-4 w-4 text-primary"
                  />
                  <label htmlFor="provider-hitpay" className="text-sm font-medium">
                    {PROVIDER_LABELS.hitpay[lang]}
                  </label>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    id="provider-billplz"
                    type="radio"
                    name="provider"
                    value="billplz"
                    checked={provider === "billplz"}
                    onChange={() => setProvider("billplz")}
                    className="h-4 w-4 text-primary"
                  />
                  <label htmlFor="provider-billplz" className="text-sm font-medium">
                    {PROVIDER_LABELS.billplz[lang]}
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  {t("billingPlan")}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="plan-starter"
                    type="radio"
                    name="plan"
                    value="starter"
                    checked={plan === "starter"}
                    onChange={() => setPlan("starter")}
                    className="h-4 w-4 text-primary"
                  />
                  <label htmlFor="plan-starter" className="text-sm font-medium">
                    {PLAN_LABELS.starter[lang]}
                  </label>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    id="plan-growth"
                    type="radio"
                    name="plan"
                    value="growth"
                    checked={plan === "growth"}
                    onChange={() => setPlan("growth")}
                    className="h-4 w-4 text-primary"
                  />
                  <label htmlFor="plan-growth" className="text-sm font-medium">
                    {PLAN_LABELS.growth[lang]}
                  </label>
                </div>
              </div>
              <div className="col-span-1 sm:col-span-2">
                <p className="text-sm text-muted-foreground mb-2">
                  {t("billingAmount")}: {selectedPrice} {t("billingPricePerMonth")}
                </p>
                <Button
                  type="submit"
                  variant="electric"
                  disabled={checkoutLoading}
                  className="w-full"
                >
                  <CreditCard className="w-4 h-4 mr-2" />{" "}
                  {checkoutLoading ? "…" : t("billingCheckoutButton")}
                </Button>
              </div>
            </div>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            {t("billingComingSoon")}
          </p>
        </Card>

        <Card className="p-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-heading font-semibold">{t("billingPaymentHistory")}</h2>
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("billingNoPayments")}</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="pb-2">{t("billingDate")}</th>
                  <th className="pb-2">{t("billingProvider")}</th>
                  <th className="pb-2">{t("billingPlan")}</th>
                  <th className="pb-2">{t("billingAmount")}</th>
                  <th className="pb-2">{t("billingStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-3">{new Date(p.createdAt).toLocaleDateString(lang === "bm" ? "ms-MY" : "en-US")}</td>
                    <td className="py-3">{PROVIDER_LABELS[p.provider]?.[lang] ?? p.provider}</td>
                    <td className="py-3">{p.plan ?? "—"}</td>
                    <td className="py-3">{p.amount / 100} {p.currency}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium border ${
                          p.status === "paid"
                            ? "border-emerald/50 bg-emerald/50 text-emerald-700"
                            : p.status === "failed"
                              ? "border-rose/50 bg-rose/50 text-rose-700"
                              : "border-amber/50 bg-amber/50 text-amber-700"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  )
}
