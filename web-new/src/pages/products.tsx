import { useEffect, useState } from "react"
import { LoaderCircle, ArrowRight, Check } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/hooks/use-language"

type Product = {
  id: string
  name: string
  tagline: string | null
  category: string | null
  descriptionEn: string | null
  descriptionMs: string | null
  tags: string[]
  metrics: string[]
  previewUrl: string | null
  imageUrl: string | null
  contactCtaEn: string | null
  contactCtaMs: string | null
  sortOrder: number
}

export function ProductsPage() {
  const { lang } = useLanguage()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/products")
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || "Failed to load")
        setProducts(data.products || [])
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
            {lang === "bm" ? "Produk" : "Products"}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {lang === "bm"
              ? "Alat dan platform kami untuk mengautomasikan operasi IT."
              : "Our tools and platforms to automate IT operations."}
          </p>
        </header>

        {products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No products published yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <Card key={p.id} className="overflow-hidden h-full flex flex-col border-2 border-border">
                {p.imageUrl && (
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-6 flex flex-col flex-1">
                  {p.category && (
                    <span className="text-xs font-medium text-electric mb-2 inline-block">
                      {p.category}
                    </span>
                  )}
                  <h3 className="text-xl font-heading font-bold mb-2">{p.name}</h3>
                  {p.tagline && <p className="text-electric font-medium mb-3">{p.tagline}</p>}
                  <p className="text-muted-foreground mb-4 flex-1">
                    {lang === "bm" ? (p.descriptionMs || p.descriptionEn) : (p.descriptionEn || p.descriptionMs)}
                  </p>
                  {(p.metrics && p.metrics.length > 0) && (
                    <ul className="space-y-2 mb-4">
                      {p.metrics.map((m, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                          {m}
                        </li>
                      ))}
                    </ul>
                  )}
                  {p.tags && p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {p.tags.slice(0, 5).map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 text-xs bg-muted rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <Button
                    variant="electric"
                    className="mt-auto w-full"
                    asChild
                  >
                    <a href={p.previewUrl || `/contact?product=${encodeURIComponent(p.name)}`} target="_blank" rel="noopener">
                      {p.contactCtaEn || p.contactCtaMs || (lang === "bm" ? "Hubungi Kami" : "Contact Us")} <ArrowRight className="w-4 h-4 ml-2" />
                    </a>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}