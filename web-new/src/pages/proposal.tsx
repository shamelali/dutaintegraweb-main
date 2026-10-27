import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { Check, LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"


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

export function ProposalPage() {
  const { id } = useParams()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [name, setName] = useState("")

  useEffect(() => {
    if (!id) return
    fetch(`/api/proposals/${id}`)
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || "Not found")
        setProposal(data.proposal)
        if (data.proposal?.status === "accepted") setAccepted(true)
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load proposal"))
  }, [id])

  const accept = async () => {
    if (!id) return
    setBusy(true)
    setError("")
    try {
      const r = await fetch(`/api/proposals/${id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-8 max-w-md text-center">
          <p className="text-destructive">{error}</p>
        </Card>
      </div>
    )
  }
  if (!proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoaderCircle className="animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-16 px-6 print:py-0 print:px-0">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          nav, footer { display: none !important; }
          body { background: white; color: #1c1917; }
          .print-page { page-break-after: always; }
          .print-footer { display: block !important; position: fixed; bottom: 0; left: 0; right: 0; font-size: 9pt; color: #57534e; text-align: center; border-top: 1px solid #e7e5e4; padding-top: 4pt; }
          h1 { page-break-after: avoid; }
          ul, li { page-break-inside: avoid; }
          @page { margin: 18mm 16mm; }
        }
        .print-footer { display: none; }
      `}</style>
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
                  <Check className="w-4 h-4 text-electric mt-0.5 shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          )}
          {proposal.valid_until && (
            <p className="text-sm text-muted-foreground mb-6">Valid until {proposal.valid_until}</p>
          )}
          {accepted || proposal.status === "accepted" ? (
            <p className="text-emerald-600 font-semibold">Accepted — thank you. We'll be in touch shortly.</p>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Your name (for acceptance record)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <Button variant="electric" size="xl" onClick={accept} disabled={busy}>
                {busy ? <LoaderCircle className="animate-spin mr-2" /> : null}
                Accept proposal
              </Button>
            </div>
          )}
        <div className="no-print mt-6">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            Print / Save as PDF
          </Button>
        </div>
        </Card>
      </div>
      <div className="print-footer">
        Duta Integra Solutions · Cyberjaya, Malaysia · dutaintegra.my · Confidential proposal
      </div>
    </div>
  )
}