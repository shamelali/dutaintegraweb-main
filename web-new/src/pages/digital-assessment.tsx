import { useState } from "react"
import type { FormEvent } from "react"
import { ArrowRight, CheckCircle2, ClipboardCheck, LoaderCircle, ShieldCheck, Sparkles, TrendingUp, Workflow } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type Result = { score: number; maturityLabel: string; recommendations: string[]; message: string }
const priorityOptions = [
  ["sales", "Sales and lead generation"], ["automation", "Workflow automation"], ["security", "Cybersecurity and PDPA"],
  ["ai", "AI adoption"], ["operations", "Operations and reporting"], ["customer-experience", "Customer experience"], ["data", "Data and reporting"],
]

export function DigitalAssessmentPage() {
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", industry: "", teamSize: "1–10", digitalMaturity: "2", budgetRange: "RM1,000–RM5,000", timeline: "Within 3 months", notes: "" })
  const [priorities, setPriorities] = useState<string[]>(["automation"])
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const update = (key: keyof typeof form, value: string) => setForm(old => ({ ...old, [key]: value }))
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setResult(null)
    try {
      const response = await fetch("/api/workspace/assessments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, digitalMaturity: Number(form.digitalMaturity), priorities }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Unable to submit assessment")
      setResult(data)
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to submit assessment. Please try again.") }
    finally { setBusy(false) }
  }
  return <div className="min-h-screen bg-gradient-to-b from-navy via-slate-deep to-background">
    <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div className="pt-3 text-white">
          <span className="inline-flex items-center gap-2 rounded-full border border-electric/30 bg-electric/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-electric"><Sparkles size={14}/> SME Digital Readiness</span>
          <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-5xl">Find your next digital growth opportunity.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">Tell us how your business works today. Get a practical starting score and prioritised recommendations from Duta Integra.</p>
          <div className="mt-8 space-y-4">
            {[[ClipboardCheck,"A structured business assessment","Understand your current digital foundations."],[TrendingUp,"Prioritised next steps","Focus on the opportunities that matter most."],[ShieldCheck,"Security-aware recommendations","Include data protection and access controls."],[Workflow,"A route to delivery","Use the results to start a proposal conversation."]].map(([Icon,title,desc],i) => { const I = Icon as typeof ClipboardCheck; return <div key={i} className="flex gap-3"><span className="mt-0.5 rounded-lg bg-white/10 p-2 text-electric"><I size={18}/></span><div><p className="font-semibold">{String(title)}</p><p className="mt-1 text-sm text-slate-400">{String(desc)}</p></div></div> })}
          </div>
          <p className="mt-8 text-xs text-slate-400">This is an initial self-assessment, not a security audit or guarantee of business outcomes.</p>
        </div>
        <Card className="border-white/10 p-5 shadow-2xl sm:p-8">
          {result ? <div className="py-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600"><CheckCircle2 size={28}/></div>
            <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Assessment received</p>
            <h2 className="mt-2 text-3xl font-bold">{result.maturityLabel}</h2>
            <div className="mt-5 flex items-end gap-2"><span className="text-5xl font-bold text-primary">{result.score}</span><span className="pb-1 text-muted-foreground">/100 readiness indicator</span></div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-electric to-emerald-500" style={{width:`${result.score}%`}}/></div>
            <h3 className="mt-7 font-semibold">Recommended starting points</h3>
            <ul className="mt-3 space-y-3">{result.recommendations.map((r,i)=><li key={i} className="flex gap-2 text-sm leading-6"><CheckCircle2 size={17} className="mt-1 shrink-0 text-emerald-600"/><span>{r}</span></li>)}</ul>
            <p className="mt-6 rounded-lg bg-muted p-4 text-sm leading-6">{result.message}</p>
            <div className="mt-6 flex flex-wrap gap-3"><Button asChild variant="electric"><Link to="/contact">Discuss a roadmap <ArrowRight size={16} className="ml-2"/></Link></Button><Button variant="outline" onClick={()=>setResult(null)}>Edit assessment</Button></div>
          </div> : <form onSubmit={submit} className="space-y-5">
            <div><p className="text-sm font-semibold uppercase tracking-wider text-electric">Free assessment</p><h2 className="mt-2 text-2xl font-bold">Tell us about your business</h2><p className="mt-2 text-sm text-muted-foreground">Required fields are marked with an asterisk.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name *"><Input required maxLength={120} value={form.name} onChange={e=>update("name",e.target.value)} placeholder="Your name"/></Field>
              <Field label="Company *"><Input required maxLength={160} value={form.company} onChange={e=>update("company",e.target.value)} placeholder="Business name"/></Field>
              <Field label="Work email *"><Input required type="email" maxLength={200} value={form.email} onChange={e=>update("email",e.target.value)} placeholder="you@company.com"/></Field>
              <Field label="Phone"><Input maxLength={40} value={form.phone} onChange={e=>update("phone",e.target.value)} placeholder="Contact number"/></Field>
              <Field label="Industry *"><Input required maxLength={100} value={form.industry} onChange={e=>update("industry",e.target.value)} placeholder="e.g. retail, services, manufacturing"/></Field>
              <Field label="Team size *"><Select value={form.teamSize} onChange={e=>update("teamSize",e.target.value)}><option>1–10</option><option>11–30</option><option>31–100</option><option>101–250</option><option>251+</option></Select></Field>
              <Field label="Digital maturity *"><Select value={form.digitalMaturity} onChange={e=>update("digitalMaturity",e.target.value)}><option value="1">1 — Mostly manual</option><option value="2">2 — Basic tools, disconnected</option><option value="3">3 — Some integrated workflows</option><option value="4">4 — Data-led and automated</option><option value="5">5 — Advanced and continuously improved</option></Select></Field>
              <Field label="Budget range *"><Select value={form.budgetRange} onChange={e=>update("budgetRange",e.target.value)}><option>Under RM1,000</option><option>RM1,000–RM5,000</option><option>RM5,001–RM15,000</option><option>RM15,001–RM50,000</option><option>RM50,000+</option><option>Need guidance</option></Select></Field>
              <Field label="Preferred timeline *"><Select value={form.timeline} onChange={e=>update("timeline",e.target.value)}><option>Immediately</option><option>Within 1 month</option><option>Within 3 months</option><option>Within 6 months</option><option>Exploring options</option></Select></Field>
            </div>
            <fieldset><legend className="mb-3 text-sm font-medium">Top business priorities * (choose all that apply)</legend><div className="grid gap-2 sm:grid-cols-2">{priorityOptions.map(([value,label])=><label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm hover:bg-muted/60"><input type="checkbox" checked={priorities.includes(value)} onChange={e=>setPriorities(old=>e.target.checked?[...old,value]:old.filter(x=>x!==value))} className="accent-cyan-500"/><span>{label}</span></label>)}</div></fieldset>
            <Field label="Anything else we should know?"><Textarea maxLength={3000} rows={3} value={form.notes} onChange={e=>update("notes",e.target.value)} placeholder="Current challenges, systems or goals (optional)"/></Field>
            {error && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <Button type="submit" variant="electric" size="lg" disabled={busy||priorities.length===0} className="w-full">{busy?<><LoaderCircle size={16} className="mr-2 animate-spin"/>Submitting securely…</>:<>Generate my assessment <ArrowRight size={16} className="ml-2"/></>}</Button>
            <p className="text-xs leading-5 text-muted-foreground">By submitting, you agree that Duta Integra may use these details to respond to your request. Do not include passwords, confidential credentials or sensitive personal data.</p>
          </form>}
        </Card>
      </div>
    </section>
  </div>
}
function Field({label,children}:{label:string;children:React.ReactNode}) { return <label className="block space-y-2"><span className="text-sm font-medium">{label}</span>{children}</label> }
