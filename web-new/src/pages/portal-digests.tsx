import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { LoaderCircle, AlertCircle, FileText, Download, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
// import { useLanguage } from "@/hooks/use-language" // unused

type Digest = {
  month: string
  sent_at: string | null
  content_json: {
    summary: string
    tickets: { subject: string; status: string }[]
    metrics: { responseTime: string; uptime: string }
  }
}

export function PortalDigestsPage() {
  const navigate = useNavigate()
  const [digests, setDigests] = useState<Digest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/portal/digests")
      .then(async (r) => {
        if (r.status === 401) return navigate("/login")
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || "Failed to load")
        setDigests(data.digests || [])
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false))
  }, [navigate])

  const downloadDigest = (digest: Digest) => {
    const content = `# Monthly Digest — ${digest.month}\n\n` +
      `**Summary:**\n${digest.content_json?.summary || "—"}\n\n` +
      `**Tickets:**\n${(digest.content_json?.tickets || []).map(t => `- ${t.subject} (${t.status})`).join("\n") || "—"}\n\n` +
      `**Metrics:**\n- Response Time: ${digest.content_json?.metrics?.responseTime || "—"}\n- Uptime: ${digest.content_json?.metrics?.uptime || "—"}\n\n` +
      `Sent: ${digest.sent_at || "Not sent"}\n`
    const blob = new Blob([content], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `digest-${digest.month.replace(" ", "-")}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoaderCircle className="animate-spin h-8 w-8" /></div>
  if (error) return <div className="min-h-screen flex items-center justify-center p-6"><Card className="p-8 max-w-md text-center"><AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" /><p className="text-destructive">{error}</p></Card></div>

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-heading font-bold mb-8">Monthly Digests</h1>
        {digests.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No digests yet</h2>
            <p className="text-muted-foreground">Monthly summaries will appear here once sent.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {digests.map((d) => (
              <Card key={d.month} className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-muted rounded-xl p-3">
                      <Calendar className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">{d.month}</h2>
                      <p className="text-sm text-muted-foreground">
                        {d.sent_at ? `Sent ${new Date(d.sent_at).toLocaleDateString()}` : "Not yet sent"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => downloadDigest(d)}>
                      <Download className="w-4 h-4 mr-2" /> Download
                    </Button>
                    <Button variant="ghost" onClick={() => navigate(`/portal/digests/${d.month}`)}>
                      <FileText className="w-4 h-4 mr-2" /> View
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