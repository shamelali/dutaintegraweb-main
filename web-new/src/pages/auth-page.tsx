import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { AlertCircle, LoaderCircle, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/hooks/use-language"

type AuthMode = "login" | "signup"

function safeNext(next: string | null): string {
  if (!next) return "/dashboard"
  const bare = next.startsWith("/ms/") ? next.slice(3) : next
  if (bare.startsWith("/portal/") || bare === "/catalog-enrichment" || bare === "/dashboard") return next
  return "/dashboard"
}

export function AuthPage({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { t } = useLanguage()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [industry, setIndustry] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const target = safeNext(params.get("next"))
  const isSignup = mode === "signup"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      const endpoint = isSignup ? "/api/auth/signup" : "/api/auth/login"
      const body = isSignup
        ? { email, password, companyName, industry: industry || undefined }
        : { email, password }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || (isSignup ? t("authSignupFailed") : t("authFailed")))
        return
      }
      navigate(target, { replace: true })
    } catch {
      setError(t("authConnectionError"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-electric">
            <Lock className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-heading font-bold">
              {isSignup ? t("authSignUp") : t("authSignIn")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSignup ? t("authSignUpDesc") : t("authSignInDesc")}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <>
              <div>
                <Label htmlFor="companyName">{t("authCompanyName")}</Label>
                <Input
                  id="companyName"
                  name="companyName"
                  autoComplete="organization"
                  required
                  className="mt-1"
                  placeholder={t("authCompanyPlaceholder")}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="industry">{t("authIndustry")}</Label>
                <Input
                  id="industry"
                  name="industry"
                  className="mt-1"
                  placeholder={t("authIndustryPlaceholder")}
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                />
              </div>
            </>
          )}

          <div>
            <Label htmlFor="email">{t("authEmail")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="password">{t("authPassword")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={isSignup ? 8 : undefined}
              className="mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {isSignup && (
              <p className="mt-1 text-xs text-muted-foreground">{t("authPasswordHint")}</p>
            )}
          </div>

          {error && (
            <p className="flex items-start gap-2 text-sm text-destructive" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {submitting
              ? t("authSubmitting")
              : isSignup
                ? t("authSignUp")
                : t("authSignIn")}
          </Button>
        </form>

        <p className="mt-6 text-sm text-muted-foreground">
          {isSignup ? t("authHaveAccount") : t("authNoAccount")}{" "}
          <Link
            to={isSignup ? "/signin" : "/signup"}
            className="text-electric underline"
          >
            {isSignup ? t("authSignInLink") : t("authCreateAccount")}
          </Link>
        </p>
      </Card>
    </div>
  )
}
