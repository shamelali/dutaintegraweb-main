import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { LoaderCircle, Check, AlertCircle, FileText, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
// import { useLanguage } from "@/hooks/use-language" // unused

type Proposal = {
  id: string
  title: string
  summary: string
  scope: string[]
  amount_myr: number
  valid_until: string | null
  status: string
  created_at: string
}

export function PortalProposalDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [name, setName] = useState("")

  useEffect(() => {
    if (!id) return
    fetch(`/api/portal/proposals/${id}`)
      .then(async (r) => {
        if (r.status === 401) return navigate("/login")
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || "Not found")
        setProposal(data.proposal)
        if (data.proposal?.status === "accepted") setAccepted(true)
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
  }, [id, navigate])

  const accept = async () => {
    if (!id || !name.trim()) return
    setBusy(true)
    setError("")
    try {
      const r = await fetch(`/api/proposals/${id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || "Failed to accept")
      setProposal(data.proposal)
      setAccepted(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to accept")
    } finally {
      setBusy(false)
    }
  }

  if (error) return <div className="min-h-screen flex items-center justify-center p-6"><Card className="p-8 max-w-md text-center"><AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" /><p className="text-destructive">{error}</p></Card></div>
  if (!proposal) return <div className="min-h-screen flex items-center justify-center"><LoaderCircle className="animate-spin h-8 w-8" /></div>

  return (
    <div className="min-h-screen bg-background py-12 px-6 print:py-0 print:px-0">
      <style>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 print:shadow-none print:border-0">
          <h1 className="text-3xl font-heading font-bold mb-2">{proposal.title}</h1>
          <p className="text-muted-foreground mb-6">{proposal.summary}</p>
          <div className="mb-6">
            <span className="text-3xl font-bold">RM {proposal.amount_myr.toLocaleString()}</span>
          </div>
          {Array.isArray(proposal.scope) && proposal.scope.length > 0 && (
            <ul className="space-y-2 mb-6">
              {proposal.scope.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          )}
          {proposal.valid_until && (
            <p className="text-sm text-muted-foreground mb-6">Valid until {proposal.valid_until}</p>
          )}
          {accepted || proposal.status === "accepted" ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
              <p className="text-emerald-700 font-semibold flex items-center gap-2">
                <Check className="w-5 h-5" />
                Accepted — thank you. We'll be in touch shortly.
              </p>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Your name (for acceptance record)</label>
                <Input
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={busy}
                />
              </div>
              <Button variant="electric" size="xl" onClick={accept} disabled={busy || !name.trim()}>
                {busy ? <LoaderCircle className="animate-spin mr-2 w-5 h-5" /> : <Check className="mr-2 w-5 h-5" />}
                Accept Proposal
              </Button>
            </div>
          )}
          {error && <p className="text-destructive text-sm mb-4">{error}</p>}
          <div className="no-print flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => window.print()}>
              <Download className="w-4 h-4 mr-2" /> Print / Save as PDF
            </Button>
            <Button variant="ghost" onClick={() => navigate("/portal/proposals")}>
              <FileText className="w-4 h-4 mr-2" /> Back to List
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}