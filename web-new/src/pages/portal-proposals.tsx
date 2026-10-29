import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { LoaderCircle, Check, AlertCircle, Download, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PortalAccountBar } from "@/components/portal-account-bar"
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

export function PortalProposalsPage() {
  const navigate = useNavigate()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/portal/proposals")
      .then(async (r) => {
        if (r.status === 401) return navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`)
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || "Failed to load")
        setProposals(data.proposals || [])
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false))
  }, [navigate])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoaderCircle className="animate-spin h-8 w-8" /></div>
  if (error) return <div className="min-h-screen flex items-center justify-center p-6"><Card className="p-8 max-w-md text-center"><AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" /><p className="text-destructive">{error}</p></Card></div>

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <PortalAccountBar />
        <h1 className="text-3xl font-heading font-bold mb-8">My Proposals</h1>
        {proposals.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No proposals yet</h2>
            <p className="text-muted-foreground">Proposals from Duta Integra will appear here.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {proposals.map((p) => (
              <Card key={p.id} className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-heading font-bold">{p.title}</h2>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        p.status === "accepted" ? "bg-emerald-100 text-emerald-700" :
                        p.status === "sent" ? "bg-blue-100 text-blue-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {p.status}
                      </span>
                    </div>
                    <p className="text-muted-foreground mb-2">{p.summary}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span>RM {p.amount_myr.toLocaleString()}</span>
                      {p.valid_until && <span>Valid until {p.valid_until}</span>}
                      <span>Created {new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {p.status === "sent" && (
                      <Button variant="electric" size="lg" onClick={() => navigate(`/portal/proposals/${p.id}`)}>
                        <Check className="w-4 h-4 mr-2" /> Review & Accept
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => navigate(`/proposal/${p.id}`)}>
                      <FileText className="w-4 h-4 mr-2" /> View Details
                    </Button>
                    <Button variant="ghost" onClick={() => window.open(`/proposal/${p.id}`, "_blank")}>
                      <Download className="w-4 h-4 mr-2" /> Print / PDF
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}