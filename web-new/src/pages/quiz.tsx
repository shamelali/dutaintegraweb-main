import { useState, useCallback } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, ArrowLeft, RotateCcw, MessageCircle, Star, Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/hooks/use-language"
import type { TranslationKey } from "@/i18n/translations"

type QuizState = "intro" | "q1" | "q2" | "q3" | "loading" | "results" | "error"

type QuizResult = {
  tier: string
  score: number
  description: string
  nextStep: string
  findings: string[]
  estimatedSavings: string
  auditDate: string
}

const questions = [
  {
    qKey: "quizQ1" as TranslationKey,
    options: [
      { key: "quizQ1A1" as TranslationKey, value: 1 },
      { key: "quizQ1A2" as TranslationKey, value: 2 },
      { key: "quizQ1A3" as TranslationKey, value: 3 },
      { key: "quizQ1A4" as TranslationKey, value: 3 },
    ],
  },
  {
    qKey: "quizQ2" as TranslationKey,
    options: [
      { key: "quizQ2A1" as TranslationKey, value: 2000 },
      { key: "quizQ2A2" as TranslationKey, value: 8000 },
      { key: "quizQ2A3" as TranslationKey, value: 15000 },
      { key: "quizQ2A4" as TranslationKey, value: 25000 },
    ],
  },
  {
    qKey: "quizQ3" as TranslationKey,
    options: [
      { key: "quizQ3A1" as TranslationKey, value: ["manual_work"] as string[] },
      { key: "quizQ3A2" as TranslationKey, value: ["scaling"] as string[] },
      { key: "quizQ3A3" as TranslationKey, value: ["security"] as string[] },
      { key: "quizQ3A4" as TranslationKey, value: ["ai_automation"] as string[] },
    ],
  },
]

export function QuizPage() {
  const { t, lang } = useLanguage()
  const [state, setState] = useState<QuizState>("intro")
  const [answers, setAnswers] = useState<Record<number, number | string[]>>({})
  const [result, setResult] = useState<QuizResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submittingLead, setSubmittingLead] = useState(false)
  const [leadSent, setLeadSent] = useState(false)

  const step = state === "q1" ? 1 : state === "q2" ? 2 : state === "q3" ? 3 : 0

  const handleAnswer = useCallback((qIndex: number, value: number | string[]) => {
    setAnswers((prev) => ({ ...prev, [qIndex]: value }))
    setState((qIndex + 2) as QuizState)
  }, [])

  const runAudit = useCallback(async () => {
    setState("loading")
    setError(null)
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamSize: answers[0],
          itSpend: answers[1],
          painPoints: answers[2],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Audit failed")
      setResult(data)
      setState("results")

      // Analytics: fire on audit completion
      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag("event", "quiz_complete", { tier: data.tier, score: data.score })
      }
      if (typeof window !== "undefined" && (window as any).fbq) {
        (window as any).fbq("track", "Lead", { content_name: data.tier, value: data.score })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setState("error")
    }
  }, [answers])

  const handleLeadSubmit = async () => {
    setSubmittingLead(true)
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: result?.tier || "Audit Lead",
          phone: "via-audit",
          email: `${Date.now()}@audit.local`,
          service: "Free IT Audit",
          source: "quiz-results",
          tier: result?.tier,
          score: result?.score,
        }),
      })
      if (res.ok) setLeadSent(true)
    } catch {
      // Fail silently — WhatsApp is the primary CTA
    } finally {
      setSubmittingLead(false)
    }
  }

  const reset = () => {
    setState("intro")
    setAnswers({})
    setResult(null)
    setError(null)
    setLeadSent(false)
  }

  const waMessage = result
    ? encodeURIComponent(
        `Hi Duta Integra! I completed the free IT audit.\n\n` +
          `My result: ${result.tier} (Score: ${result.score}/100)\n` +
          `Estimated savings: ${result.estimatedSavings}\n\n` +
          `I'd like to discuss next steps.`
      )
    : ""

  const tierIcon = result?.tier === "AI Partner" ? "🤖" : result?.tier === "Growth" ? "📈" : "🛡️"

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-slate-deep to-navy flex items-center justify-center px-6 py-24">
      <div className="w-full max-w-2xl">
        {/* Intro */}
        {state === "intro" && (
          <Card className="p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-electric/10 flex items-center justify-center mx-auto mb-6">
              <Star className="w-8 h-8 text-electric" />
            </div>
            <h1 className="text-3xl font-heading font-bold mb-3">{t("quizTitle")}</h1>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">{t("quizDesc")}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="electric" size="lg" onClick={() => setState("q1")}>
                <span className="flex items-center gap-2">
                  {t("quizStart")}
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/contact">{t("quizContactInstead")}</Link>
              </Button>
            </div>
          </Card>
        )}

        {/* Questions */}
        {step >= 1 && step <= 3 && (
          <Card className="p-10">
            {/* Progress */}
            <div className="flex items-center gap-2 mb-8">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    s <= step ? "bg-electric" : "bg-muted"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between mb-6">
              <Badge variant="outline">{t("quizStep")} {step}/3</Badge>
              {step > 1 && (
                <Button variant="ghost" size="sm" onClick={() => setState(`q${step - 1}` as QuizState)}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  {t("quizBack")}
                </Button>
              )}
            </div>

            <h2 className="text-2xl font-heading font-bold mb-6">{t(questions[step - 1].qKey)}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {questions[step - 1].options.map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => handleAnswer(step - 1, opt.value)}
                  className={`p-4 rounded-xl border text-left transition-all hover:border-electric hover:bg-electric/5 ${
                    answers[step - 1] === opt.value
                      ? "border-electric bg-electric/10"
                      : "border-border"
                  }`}
                >
                  <span className="font-medium text-sm">{t(opt.key)}</span>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Loading */}
        {state === "loading" && (
          <Card className="p-10 text-center">
            <Loader2 className="w-12 h-12 text-electric animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-heading font-bold mb-2">{lang === "ms" ? "Menganalisis..." : "Analyzing..."}</h2>
            <p className="text-muted-foreground text-sm">
              {lang === "ms"
                ? "Menyemak infrastruktur IT anda dan mengira potensi penjimatan..."
                : "Reviewing your IT infrastructure and calculating potential savings..."}
            </p>
          </Card>
        )}

        {/* Error */}
        {state === "error" && (
          <Card className="p-10 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-heading font-bold mb-2">
              {lang === "ms" ? "Berlaku ralat" : "Something went wrong"}
            </h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="electric" onClick={runAudit}>
                {lang === "ms" ? "Cuba lagi" : "Try again"}
              </Button>
              <Button variant="outline" onClick={reset}>
                {t("quizRetake")}
              </Button>
            </div>
          </Card>
        )}

        {/* Results */}
        {state === "results" && result && (
          <Card className="p-10">
            {/* Tier header */}
            <div className="text-center mb-8">
              <Badge variant="electric" className="mb-3">{t("quizAuditComplete")}</Badge>
              <div className="text-4xl mb-3">{tierIcon}</div>
              <h1 className="text-3xl font-heading font-bold mb-2">
                {result.tier === "AI Partner"
                  ? (lang === "ms" ? "AI Partner" : "AI Partner")
                  : result.tier === "Growth"
                    ? (lang === "ms" ? "Growth" : "Growth")
                    : (lang === "ms" ? "Foundation" : "Foundation")
                }
              </h1>
              <p className="text-muted-foreground max-w-md mx-auto mb-4">{result.description}</p>
              <div className="inline-flex items-center gap-2 bg-electric/10 rounded-full px-4 py-2">
                <span className="text-2xl font-bold text-electric">{result.score}</span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
            </div>

            {/* Findings */}
            {result.findings.length > 0 && (
              <div className="mb-8">
                <h3 className="font-heading font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">
                  {lang === "ms" ? "Penemuan Audit" : "Audit Findings"}
                </h3>
                <div className="space-y-2">
                  {result.findings.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Star className="w-4 h-4 text-electric shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Savings */}
            <div className="bg-electric/10 rounded-xl p-6 mb-8 text-center">
              <p className="text-sm text-muted-foreground mb-1">
                {lang === "ms" ? "Potensi Penjimatan Tahunan" : "Estimated Annual Savings"}
              </p>
              <p className="text-2xl font-bold text-electric">{result.estimatedSavings}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {lang === "ms" ? "Audit dijalankan pada" : "Audit completed on"} {result.auditDate}
              </p>
            </div>

            {/* WhatsApp CTA */}
            <div className="mb-8 text-center">
              <h3 className="font-heading font-semibold mb-3">{t("quizLeadTitle")}</h3>
              <p className="text-sm text-muted-foreground mb-4">{result.nextStep}</p>
              <a
                href={`https://wa.me/601154034051?text=${waMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                {lang === "ms" ? "Bual di WhatsApp" : "Chat on WhatsApp"}
              </a>
            </div>

            {/* Optional email follow-up */}
            {!leadSent && (
              <div className="text-center mb-6">
                <Button variant="ghost" size="sm" onClick={handleLeadSubmit} disabled={submittingLead}>
                  {submittingLead
                    ? (lang === "ms" ? "Menghantar..." : "Sending...")
                    : (lang === "ms" ? "Hantar ringkasan audit ke email" : "Email audit summary to me")
                  }
                </Button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" className="flex-1" onClick={reset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                {t("quizRetake")}
              </Button>
              <Button asChild variant="electric" className="flex-1">
                <Link to="/contact">{t("quizContactUs")}</Link>
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
