import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { AlertCircle, ArrowRight, Bot, LoaderCircle, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DutaosAccountBar } from "@/components/dutaos-account-bar"
import { useLanguage } from "@/hooks/use-language"

type Brief = {
  company: { name: string; industry: string | null; tier: string; status: string } | null
  compliance: {
    total: number
    pending: number
    completed: number
    overdue: number
    nextDue: { type: string; dueDate: string } | null
  }
  generatedAt: string
}

type ChatMessage = { role: "user" | "assistant"; content: string }

const TYPE_LABELS: Record<string, { en: string; bm: string }> = {
  ssm: { en: "SSM Registration", bm: "Pendaftaran SSM" },
  pdpa: { en: "PDPA Compliance", bm: "Pematuhan PDPA" },
  myinvois: { en: "MyInvois (E-Invoice)", bm: "MyInvois (E-Invois)" },
  tax: { en: "Tax Compliance", bm: "Pematuhan Cukai" },
}

export function DutaosDashboardPage() {
  const navigate = useNavigate()
  const { t, lang } = useLanguage()
  const [brief, setBrief] = useState<Brief | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { role: "assistant", content: t("dashboardChatWelcome") },
  ])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch("/api/dutaos/brief", { credentials: "same-origin" })
        if (res.status === 401) {
          if (active) navigate(`/signin?next=${encodeURIComponent(window.location.pathname)}`)
          return
        }
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to load")
        if (active) setBrief(data.brief)
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : t("dashboardError"))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [navigate, t])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, busy])

  async function send(message: string) {
    const text = message.trim()
    if (!text || busy) return
    setInput("")
    setBusy(true)
    setMessages((old) => [...old, { role: "user", content: text }])
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ message: text }),
      })
      if (res.status === 401) return navigate(`/signin?next=${encodeURIComponent(window.location.pathname)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("dashboardChatError"))
      setMessages((old) => [...old, { role: "assistant", content: data.response }])
    } catch {
      setMessages((old) => [...old, { role: "assistant", content: t("dashboardChatError") }])
    } finally {
      setBusy(false)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(lang === "bm" ? "ms-MY" : "en-MY")
  }

  function typeLabel(type: string) {
    return TYPE_LABELS[type]?.[lang] ?? type
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoaderCircle className="animate-spin h-8 w-8" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive">{error}</p>
        </Card>
      </div>
    )
  }

  const c = brief?.compliance
  const quickPrompts = [t("dashboardQuick1"), t("dashboardQuick2"), t("dashboardQuick3")]

  return (
    <div className="min-h-screen bg-background py-10 px-6">
      <div className="max-w-6xl mx-auto">
        <DutaosAccountBar />

        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold">{t("dashboardTitle")}</h1>
          <p className="text-muted-foreground">{t("dashboardSub")}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("dashboardPending")}</p>
                <p className="mt-1 text-2xl font-heading font-bold">{c?.pending ?? 0}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("dashboardCompleted")}</p>
                <p className="mt-1 text-2xl font-heading font-bold">{c?.completed ?? 0}</p>
              </Card>
              <Card className={`p-4 ${c && c.overdue > 0 ? "border-destructive/40" : ""}`}>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("dashboardOverdue")}</p>
                <p className={`mt-1 text-2xl font-heading font-bold ${c && c.overdue > 0 ? "text-destructive" : ""}`}>
                  {c?.overdue ?? 0}
                </p>
              </Card>
            </div>

            <Card className="p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("dashboardNextDue")}</p>
              {c?.nextDue ? (
                <p className="mt-1 text-lg font-semibold">
                  {typeLabel(c.nextDue.type)} · {formatDate(c.nextDue.dueDate)}
                </p>
              ) : (
                <p className="mt-1 text-muted-foreground">{t("dashboardNoDue")}</p>
              )}
              <Link
                to="/portal/compliance"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-electric hover:underline"
              >
                {t("dashboardManage")} <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>
          </div>

          <Card className="flex h-[30rem] flex-col overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Bot className="h-5 w-5 text-electric" />
              <h2 className="font-heading font-bold">{t("dashboardChatTitle")}</h2>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                      m.role === "user" ? "bg-electric text-navy font-medium" : "bg-muted text-foreground"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {busy && <p className="text-sm text-muted-foreground">{t("dashboardChatThinking")}</p>}
            </div>

            <div className="border-t border-border p-3">
              <div className="mb-2 flex flex-wrap gap-2">
                {quickPrompts.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    disabled={busy}
                    className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  send(input)
                }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t("dashboardChatPlaceholder")}
                  disabled={busy}
                  maxLength={2000}
                  className="flex-1"
                />
                <Button type="submit" variant="electric" disabled={busy || !input.trim()} aria-label={t("dashboardChatSend")}>
                  {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </div>
          </Card>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">{t("dashboardChatDisclaimer")}</p>
      </div>
    </div>
  )
}
