import { useEffect, useState } from "react"
import { LoaderCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/hooks/use-language"

type CaseStudy = {
  id: string
  clientName: string
  category: string | null
  summaryEn: string | null
  summaryMs: string | null
  imageUrl: string | null
  metrics: Record<string, unknown>
  outcomes: string[]
  tags: string[]
  detailUrl: string | null
  sortOrder: number
}

export function CaseStudiesPage() {
  const { lang } = useLanguage()
  const [studies, setStudies] = useState<CaseStudy[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/case-studies")
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || "Failed to load")
        setStudies(data.caseStudies || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoaderCircle className="animate-spin h-8 w-8" /></div>

  return (
    <div className="min-h-screen bg-background py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">
            {lang === "bm" ? "Kajian Kes" : "Case Studies"}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {lang === "bm"
              ? "Lihat bagaimana kami membantu pelanggan mencapai matlamat mereka."
              : "See how we've helped clients achieve their goals."}
          </p>
        </header>

        {studies.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No case studies published yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {studies.map((s) => (
              <Card key={s.id} className="overflow-hidden h-full flex flex-col">
                {s.imageUrl && (
                  <img
                    src={s.imageUrl}
                    alt={s.clientName}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-6 flex flex-col flex-1">
                  {s.category && (
                    <span className="text-xs font-medium text-electric mb-2 inline-block">
                      {s.category}
                    </span>
                  )}
                  <h3 className="text-xl font-heading font-bold mb-3">{s.clientName}</h3>
                  <p className="text-muted-foreground mb-4 flex-1">
                    {lang === "bm" ? (s.summaryMs || s.summaryEn) : (s.summaryEn || s.summaryMs)}
                  </p>
                  {s.outcomes && s.outcomes.length > 0 && (
                    <ul className="space-y-1 mb-4 text-sm">
                      {s.outcomes.slice(0, 3).map((o, i) => (
                        <li key={i} className="flex items-center gap-2 text-muted-foreground">
                          <span className="w-1.5 h-1.5 rounded-full bg-electric" />
                          {o}
                        </li>
                      ))}
                    </ul>
                  )}
                  {s.tags && s.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {s.tags.slice(0, 4).map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 text-xs bg-muted rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {s.detailUrl && (
                    <Button variant="outline" className="mt-auto w-full" asChild>
                      <a href={s.detailUrl} target="_blank" rel="noopener">
                        {lang === "bm" ? "Baca Lengkap" : "Read Full Case"} →
                      </a>
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}