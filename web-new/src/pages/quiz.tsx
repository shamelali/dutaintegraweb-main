import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, ArrowLeft, RotateCcw, MessageCircle, Star, Zap, Shield, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/hooks/use-language"
import type { TranslationKey } from "@/i18n/translations"

type Answer = string
type Results = { tier: string; title: string; desc: string; features: string[]; icon: React.ReactNode }

const questions = [
  {
    qKey: "quizQ1" as TranslationKey,
    options: [
      { key: "quizQ1A1" as TranslationKey, value: "1-5" },
      { key: "quizQ1A2" as TranslationKey, value: "6-20" },
      { key: "quizQ1A3" as TranslationKey, value: "21-50" },
      { key: "quizQ1A4" as TranslationKey, value: "50+" },
    ],
  },
  {
    qKey: "quizQ2" as TranslationKey,
    options: [
      { key: "quizQ2A1" as TranslationKey, value: "no-it" },
      { key: "quizQ2A2" as TranslationKey, value: "part-time" },
      { key: "quizQ2A3" as TranslationKey, value: "outsourced" },
      { key: "quizQ2A4" as TranslationKey, value: "in-house" },
    ],
  },
  {
    qKey: "quizQ3" as TranslationKey,
    options: [
      { key: "quizQ3A1" as TranslationKey, value: "reduce-cost" },
      { key: "quizQ3A2" as TranslationKey, value: "save-time" },
      { key: "quizQ3A3" as TranslationKey, value: "security" },
      { key: "quizQ3A4" as TranslationKey, value: "grow" },
    ],
  },
]

function getResults(answers: Record<number, string>): Results {
  const size = answers[0]
  const it = answers[1]
  const goal = answers[2]

  if (size === "1-5" && (it === "no-it" || it === "part-time")) {
    return {
      tier: "Starter",
      title: "quizResStarterTitle",
      desc: "quizResStarterDesc",
      features: ["quizResStarterF1", "quizResStarterF2", "quizResStarterF3"],
      icon: <Shield className="w-6 h-6 text-electric" />,
    }
  }
  if (size === "6-20" || (size === "1-5" && it === "outsourced")) {
    return {
      tier: "Growth",
      title: "quizResGrowthTitle",
      desc: "quizResGrowthDesc",
      features: ["quizResGrowthF1", "quizResGrowthF2", "quizResGrowthF3", "quizResGrowthF4"],
      icon: <Zap className="w-6 h-6 text-electric" />,
    }
  }
  return {
    tier: "Enterprise",
    title: "quizResEntTitle",
    desc: "quizResEntDesc",
    features: ["quizResEntF1", "quizResEntF2", "quizResEntF3", "quizResEntF4", "quizResEntF5"],
    icon: <Users className="w-6 h-6 text-electric" />,
  }
}

export function QuizPage() {
  const { t } = useLanguage()
  const [step, setStep] = useState(0) // 0 = intro, 1-3 = questions, 4 = results
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const results = step === 4 ? getResults(answers) : null

  const handleAnswer = (qIndex: number, value: string) => {
    setAnswers({ ...answers, [qIndex]: value })
    setTimeout(() => setStep(qIndex + 2), 300)
  }

  const handleLeadSubmit = async () => {
    if (!name || !phone) return
    setSubmitted(true)
    try {
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          source: "quiz-lead",
          tier: results?.tier,
          answers,
        }),
      })
    } catch {
      // silent
    }
  }

  const reset = () => {
    setStep(0)
    setAnswers({})
    setName("")
    setPhone("")
    setSubmitted(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-slate-deep to-navy flex items-center justify-center px-6 py-24">
      <div className="w-full max-w-2xl">
        {/* Intro */}
        {step === 0 && (
          <Card className="p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-electric/10 flex items-center justify-center mx-auto mb-6">
              <Star className="w-8 h-8 text-electric" />
            </div>
            <h1 className="text-3xl font-heading font-bold mb-3">{t("quizTitle")}</h1>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">{t("quizDesc")}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="electric" size="lg" onClick={() => setStep(1)}>
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
                <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  {t("quizBack")}
                </Button>
              )}
            </div>

            <h2 className="text-2xl font-heading font-bold mb-6">{t(questions[step - 1].qKey)}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {questions[step - 1].options.map((opt) => (
                <button
                  key={opt.value}
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

        {/* Results */}
        {step === 4 && results && (
          <Card className="p-10">
            <div className="text-center mb-8">
              <Badge variant="electric" className="mb-3">{t("quizAuditComplete")}</Badge>
              <div className="w-16 h-16 rounded-2xl bg-electric/10 flex items-center justify-center mx-auto mb-4">
                {results.icon}
              </div>
              <h1 className="text-3xl font-heading font-bold mb-2">{t(results.title as TranslationKey)}</h1>
              <p className="text-muted-foreground max-w-md mx-auto">{t(results.desc as TranslationKey)}</p>
            </div>

            <div className="space-y-2 mb-8">
              {results.features.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <Star className="w-4 h-4 text-electric shrink-0" />
                  <span>{t(f as TranslationKey)}</span>
                </div>
              ))}
            </div>

            {/* Optional lead capture — shown after results */}
            {!submitted ? (
              <div className="bg-muted/50 rounded-xl p-6 mb-8">
                <h3 className="font-heading font-semibold mb-1">{t("quizLeadTitle")}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t("quizLeadDesc")}</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="space-y-1">
                    <Label htmlFor="quizName">{t("quizLeadName")}</Label>
                    <Input
                      id="quizName"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ahmad"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="quizPhone">{t("quizLeadPhone")}</Label>
                    <Input
                      id="quizPhone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="012 345 6789"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="electric"
                    className="flex-1"
                    onClick={handleLeadSubmit}
                    disabled={!name || !phone}
                  >
                    <span className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      {t("quizLeadCta")}
                    </span>
                  </Button>
                  <Button variant="ghost" className="flex-1" onClick={() => setSubmitted(true)}>
                    {t("quizSkip")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-electric/10 rounded-xl p-6 mb-8 text-center">
                <p className="font-medium mb-2">{t("quizLeadThanks")}</p>
                <a
                  href="https://wa.me/601154034051?text=Hi%20Duta%20Integra!%20I%20completed%20the%20free%20IT%20audit."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-electric font-semibold text-sm hover:underline"
                >
                  {t("quizLeadWa")}
                </a>
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
