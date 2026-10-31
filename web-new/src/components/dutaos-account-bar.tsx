import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/hooks/use-language"

type Company = {
  id: string
  name: string
  email: string
  industry: string | null
  subscriptionTier: string
  subscriptionStatus: string
}

/**
 * Identity + sign-out strip for DutaOS company accounts. The legacy
 * PortalAccountBar reads /api/portal/me, which is the Supabase portal identity
 * and answers 401 for a dutaos_session, so DutaOS pages use this one.
 */
export function DutaosAccountBar() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [company, setCompany] = useState<Company | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    let active = true
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then(async (r) => {
        if (!r.ok) return null
        const data = await r.json()
        return (data.company as Company) ?? null
      })
      .then((c) => {
        if (active && c) setCompany(c)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  async function signOut() {
    setSigningOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" })
    } finally {
      setSigningOut(false)
      navigate("/signin", { replace: true })
    }
  }

  if (!company) return null

  return (
    <div className="mb-8 flex flex-col gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {t("dashboardSignedInAs")} <span className="font-medium text-foreground">{company.name}</span>
        {company.industry ? ` · ${company.industry}` : ""}
      </p>
      <Button variant="ghost" size="sm" onClick={signOut} disabled={signingOut}>
        <LogOut className="h-4 w-4" />
        {signingOut ? t("dashboardSigningOut") : t("dashboardSignOut")}
      </Button>
    </div>
  )
}
