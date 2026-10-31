import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { LoaderCircle, Check, AlertCircle, Plus, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DutaosAccountBar } from "@/components/dutaos-account-bar"
import { useLanguage } from "@/hooks/use-language"

type ComplianceItem = {
  id: string
  companyId: string
  type: string
  status: string
  dueDate: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

const COMPLIANCE_TYPES = [
  { value: "ssm", label: { en: "SSM Registration", bm: "Pendaftaran SSM" } },
  { value: "pdpa", label: { en: "PDPA Compliance", bm: "Pematuhan PDPA" } },
  { value: "myinvois", label: { en: "MyInvois (E-Invoice)", bm: "MyInvois (E-Invois)" } },
  { value: "tax", label: { en: "Tax Compliance", bm: "Pematuhan Cukai" } },
]

export function PortalCompliancePage() {
  const navigate = useNavigate()
  const { t, lang } = useLanguage()
  const [items, setItems] = useState<ComplianceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [newType, setNewType] = useState("")
  const [newDueDate, setNewDueDate] = useState("")

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    try {
      const res = await fetch("/api/compliance-items")
      if (res.status === 401) return navigate(`/signin?next=${encodeURIComponent(window.location.pathname)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load")
      setItems(data.items || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  async function addItem() {
    if (!newType) return
    try {
      const res = await fetch("/api/compliance-items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: newType, due_date: newDueDate || null }),
      })
      if (res.status === 401) return navigate(`/signin?next=${encodeURIComponent(window.location.pathname)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create")
      setItems([data.item, ...items])
      setNewType("")
      setNewDueDate("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create")
    }
  }

  async function toggleItem(item: ComplianceItem) {
    const nextStatus = item.status === "completed" ? "pending" : "completed"
    try {
      const res = await fetch(`/api/compliance-items/${item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (res.status === 401) return navigate(`/signin?next=${encodeURIComponent(window.location.pathname)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update")
      setItems(items.map((i) => (i.id === item.id ? data.item : i)))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update")
    }
  }

  async function deleteItem(id: string) {
    if (!window.confirm("Delete this compliance item?")) return
    try {
      const res = await fetch(`/api/compliance-items/${id}`, { method: "DELETE" })
      if (res.status === 401) return navigate(`/signin?next=${encodeURIComponent(window.location.pathname)}`)
      if (!res.ok) throw new Error("Failed to delete")
      setItems(items.filter((i) => i.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete")
    }
  }

  const typeLabel = (value: string) => {
    const found = COMPLIANCE_TYPES.find((c) => c.value === value)
    return found ? found.label[lang] : value
  }

  const statusColor = (status: string) => {
    if (status === "completed") return "bg-emerald-100 text-emerald-700"
    return "bg-amber-100 text-amber-700"
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoaderCircle className="animate-spin h-8 w-8" /></div>
  if (error) return <div className="min-h-screen flex items-center justify-center p-6"><Card className="p-8 max-w-md text-center"><AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" /><p className="text-destructive">{error}</p></Card></div>

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <DutaosAccountBar />
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-heading font-bold">{t("compliancePageTitle")}</h1>
            <p className="text-muted-foreground">{t("compliancePageSub")}</p>
          </div>
          <Button variant="electric" onClick={() => {}}>
            <CheckCircle2 className="w-4 h-4 mr-2" /> {t("complianceMarkAll")}
          </Button>
        </div>

        <Card className="mb-8 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="new-type" className="text-sm font-medium">{t("complianceAddType")}</Label>
              <select id="new-type" value={newType} onChange={(e) => setNewType(e.target.value)} className="border border-input bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">{t("complianceSelectType")}</option>
                {COMPLIANCE_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label[lang]}</option>
                ))}
              </select>
            </div>
            <Input
              id="new-due-date"
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              placeholder={t("complianceDueDate")}
              className="max-w-xs sm:max-w-md"
            />
            <Button onClick={addItem} disabled={!newType}>
              <Plus className="w-4 h-4 mr-2" /> {t("complianceAdd")}
            </Button>
          </div>
        </Card>

        {items.length === 0 ? (
          <Card className="p-12 text-center">
            <Plus className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t("complianceNoItems")}</h2>
            <p className="text-muted-foreground">{t("complianceNoItemsDesc")}</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.id} className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-lg font-heading font-bold">{typeLabel(item.type)}</h2>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(item.status)}`}>
                        {item.status === "completed" ? t("complianceDone") : t("compliancePending")}
                      </span>
                    </div>
                    {item.dueDate && (
                      <p className="text-sm text-muted-foreground">
                        {t("complianceDue")}: {new Date(item.dueDate).toLocaleDateString(lang === "bm" ? "ms-MY" : "en-MY")}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleItem(item)}
                    >
                      {item.status === "completed" ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 mr-1" /> {t("complianceReopen")}
                        </>
                      ) : (
                        <>
                          <Check className="w-3 h-3 mr-1" /> {t("complianceMarkDone")}
                        </>
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteItem(item.id)}>
                      <AlertCircle className="w-3 h-3 mr-1" />
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
