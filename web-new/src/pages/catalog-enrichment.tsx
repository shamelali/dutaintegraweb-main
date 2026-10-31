import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { LoaderCircle, Image, Edit3, Trash2, Save, Plus } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/hooks/use-language"

type CatalogItem = {
  id: string
  title: string | null
  description: string | null
  category: string | null
  specs: Record<string, string>
  tags: string[]
  imageUrl: string | null
  sourceImage: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export function CatalogEnrichmentPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [error, setError] = useState("")
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

  const [draft, setDraft] = useState({
    title: "",
    description: "",
    category: "",
    specs: [{ key: "", value: "" }],
    tags: "",
    imageUrl: "",
  })

  const [editingId, setEditingId] = useState<string | null>(null)

  const fileInput = useRef<HTMLInputElement>(null)

  const vlmModel = import.meta.env.VITE_OLLAMA_MODEL ?? "configured model"

  function redirectToSignIn() {
    navigate(`/signin?next=${encodeURIComponent(window.location.pathname)}`)
  }

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    setLoading(true)
    try {
      const res = await fetch("/api/catalog/items")
      if (res.status === 401) return redirectToSignIn()
      if (!res.ok) throw new Error(t("catalogErrLoad"))
      const data = await res.json()
      setItems(data.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t("catalogErrLoad"))
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError("")
    try {
      const specs: Record<string, string> = {}
      for (const s of draft.specs) {
        if (s.key.trim()) specs[s.key.trim()] = s.value.trim()
      }
      const tags = draft.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)

      const body: Record<string, unknown> = {
        title: draft.title || null,
        description: draft.description || null,
        category: draft.category || null,
        specs,
        tags,
        imageUrl: draft.imageUrl || null,
        sourceImage: draft.imageUrl || null,
        status: "draft",
      }

      const url = editingId ? `/api/catalog/items/${editingId}` : "/api/catalog/items"
      const method = editingId ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.status === 401) return redirectToSignIn()
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || t("catalogErrSave"))
      }
      setEditingId(null)
      resetDraft()
      await loadItems()
    } catch (err) {
      setError(err instanceof Error ? err.message : t("catalogErrSave"))
    } finally {
      setSaving(false)
    }
  }

  async function handleEnrich() {
    if (!file) return
    setEnriching(true)
    setError("")
    try {
      const formData = new FormData()
      formData.append("image", file)

      const res = await fetch("/api/catalog/enrich", { method: "POST", body: formData })
      if (res.status === 401) return redirectToSignIn()
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || t("catalogErrEnrich"))
      }
      const data = await res.json()
      setDraft((old) => ({
        ...old,
        title: data.title ?? "",
        description: data.description ?? "",
        category: data.category ?? "",
        specs: Object.entries(data.specs ?? {}).map(([k, v]) => ({ key: k, value: String(v) })),
        tags: (data.tags ?? []).join(", "),
        imageUrl: old.imageUrl,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : t("catalogErrEnrich"))
    } finally {
      setEnriching(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("catalogDeleteConfirm"))) return
    try {
      const res = await fetch(`/api/catalog/items/${id}`, { method: "DELETE" })
      if (res.status === 401) return redirectToSignIn()
      if (!res.ok) throw new Error(t("catalogErrDelete"))
      await loadItems()
    } catch (err) {
      setError(err instanceof Error ? err.message : t("catalogErrDelete"))
    }
  }

  function startEdit(item: CatalogItem) {
    setEditingId(item.id)
    setDraft({
      title: item.title ?? "",
      description: item.description ?? "",
      category: item.category ?? "",
      specs: Object.entries(item.specs).map(([k, v]) => ({ key: k, value: v })),
      tags: (item.tags ?? []).join(", "),
      imageUrl: item.imageUrl ?? "",
    })
    setPreview(item.imageUrl ?? null)
    setFile(null)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function resetDraft() {
    setDraft({
      title: "",
      description: "",
      category: "",
      specs: [{ key: "", value: "" }],
      tags: "",
      imageUrl: "",
    })
    setPreview(null)
    setFile(null)
    if (fileInput.current) fileInput.current.value = ""
  }

  function addSpecRow() {
    setDraft((old) => ({ ...old, specs: [...old.specs, { key: "", value: "" }] }))
  }

  function removeSpecRow(index: number) {
    setDraft((old) => ({
      ...old,
      specs: old.specs.filter((_, i) => i !== index),
    }))
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null
    setFile(selected)
    if (selected) {
      const url = URL.createObjectURL(selected)
      setPreview(url)
      setDraft((old) => ({ ...old, imageUrl: url }))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoaderCircle className="animate-spin h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-10 px-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-heading font-bold">{t("catalogPageTitle")}</h1>
          <p className="mt-2 text-muted-foreground">{t("catalogPageSub")}</p>
        </header>

        {error && (
          <div className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card className="mb-10 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Plus className="h-5 w-5 text-electric" />
              <h2 className="text-lg font-semibold">{t("catalogUploadTitle")}</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <label className="flex flex-col items-center justify-center w-full h-48 rounded-2xl border-2 border-dashed border-border cursor-pointer hover:border-electric/50 transition-colors group">
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInput}
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                  <Image className="mb-3 h-10 w-10 opacity-50 group-hover:opacity-100" />
                  <p className="text-sm text-muted-foreground group-hover:text-foreground">
                    {file ? file.name : t("catalogChooseImage")}
                  </p>
                </label>
                {preview && (
                  <div className="relative">
                    <img src={preview} alt={t("catalogChooseImage")} className="w-full rounded-xl border border-border" />
                    <button
                      type="button"
                      onClick={() => {
                        setPreview(null)
                        setFile(null)
                        setDraft((old) => ({ ...old, imageUrl: "" }))
                        if (fileInput.current) fileInput.current.value = ""
                      }}
                      className="absolute -top-2 -right-2 rounded-full bg-destructive text-white p-1 hover:bg-destructive/90"
                      aria-label={t("catalogRemoveImage")}
                    >
                      <span className="sr-only">{t("catalogRemoveImage")}</span>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <Button
                  onClick={handleEnrich}
                  disabled={!file || enriching}
                  variant="electric"
                  className="w-full"
                >
                  {enriching ? (
                    <>
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      {t("catalogExtracting")}
                    </>
                  ) : (
                    <>
                      <Image className="mr-2 h-4 w-4" /> {t("catalogEnrichBtn")}
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-xl text-sm">
                  <p className="font-semibold mb-2">{t("catalogVlmExtracts")}</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• {t("catalogProductTitle")}</li>
                    <li>• {t("catalogDescription")}</li>
                    <li>• {t("catalogCategory")}</li>
                    <li>• {t("catalogSpecs")}</li>
                    <li>• {t("catalogTags")}</li>
                  </ul>
                </div>
                <p className="text-xs text-muted-foreground">{t("catalogPoweredBy")}</p>
                <p className="text-xs text-muted-foreground">VLM: {vlmModel}</p>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-border">
              <div className="flex items-center gap-2 mb-6">
                <Edit3 className="h-5 w-5 text-electric" />
                <h2 className="text-lg font-semibold">{t("catalogReviewTitle")}</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("catalogTitleLabel")}</Label>
                  <Input
                    value={draft.title}
                    onChange={(e) => setDraft((old) => ({ ...old, title: e.target.value }))}
                    placeholder={t("catalogTitlePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("catalogCategory")}</Label>
                  <Input
                    value={draft.category}
                    onChange={(e) => setDraft((old) => ({ ...old, category: e.target.value }))}
                    placeholder={t("catalogCategoryPlaceholder")}
                  />
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <Label>{t("catalogDescription")}</Label>
                <Textarea
                  value={draft.description}
                  onChange={(e) => setDraft((old) => ({ ...old, description: e.target.value }))}
                  rows={3}
                  placeholder={t("catalogDescriptionPlaceholder")}
                />
              </div>

              <div className="space-y-2 mt-4">
                <div className="flex items-center justify-between">
                  <Label>{t("catalogSpecsLabel")}</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addSpecRow}>
                    {t("catalogAddSpec")}
                  </Button>
                </div>
                <div className="space-y-2">
                  {draft.specs.map((spec, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2 items-center">
                      <Input
                        value={spec.key}
                        onChange={(e) =>
                          setDraft((old) => {
                            const specs = [...old.specs]
                            specs[i] = { ...specs[i], key: e.target.value }
                            return { ...old, specs }
                          })
                        }
                        placeholder={t("catalogKey")}
                      />
                      <Input
                        value={spec.value}
                        onChange={(e) =>
                          setDraft((old) => {
                            const specs = [...old.specs]
                            specs[i] = { ...specs[i], value: e.target.value }
                            return { ...old, specs }
                          })
                        }
                        placeholder={t("catalogValue")}
                      />
                      <button
                        type="button"
                        onClick={() => removeSpecRow(i)}
                        className="p-1.5 text-muted-foreground hover:text-destructive"
                        aria-label={t("catalogRemoveImage")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <Label>{t("catalogTagsLabel")}</Label>
                <Input
                  value={draft.tags}
                  onChange={(e) => setDraft((old) => ({ ...old, tags: e.target.value }))}
                  placeholder={t("catalogTagsPlaceholder")}
                />
              </div>

              <div className="space-y-2 mt-4">
                <Label>{t("catalogImageUrl")}</Label>
                <Input
                  value={draft.imageUrl}
                  onChange={(e) => setDraft((old) => ({ ...old, imageUrl: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={saving || !draft.title.trim()}
                variant="electric"
                className="mt-6 w-auto"
              >
                {saving ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    {t("catalogSaving")}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> {editingId ? t("catalogUpdate") : t("catalogSave")}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetDraft}
                className="mt-6"
                disabled={saving}
              >
                {t("catalogCancel")}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">{t("catalogSavedItems")}</h2>
              <Button variant="outline" size="sm" onClick={resetDraft}>
                {t("catalogNewItem")}
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {t("catalogEmpty")}
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title ?? ""} className="w-16 h-16 object-cover rounded-lg" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                        <Image className="h-8 w-8" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-sm font-medium truncate">{item.title ?? t("catalogUntitled")}</span>
                        {item.status === "published" && (
                          <span className="px-1.5 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                            {t("catalogPublished")}
                          </span>
                        )}
                      </div>
                      {item.category && (
                        <p className="text-xs text-muted-foreground truncate">{item.category}</p>
                      )}
                      {item.tags && item.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.tags.slice(0, 4).map((tag, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded text-xs bg-muted/50">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(item)}
                        className="hover:bg-electric/10 text-electric"
                      >
                        {t("catalogEdit")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        className="hover:bg-destructive/10 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
