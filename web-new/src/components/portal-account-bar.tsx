import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

type Client = { name: string; email: string; company: string | null; tier: string }

/**
 * Identity + sign-out strip for the client portal pages. The portal API has
 * always had /api/portal/logout; nothing in the UI called it, so a signed-in
 * client could not end their session.
 */
export function PortalAccountBar() {
  const navigate = useNavigate()
  const [client, setClient] = useState<Client | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    let active = true
    fetch("/api/portal/me", { credentials: "same-origin" })
      .then(async (r) => {
        if (!r.ok) return null
        const data = await r.json()
        return (data.client as Client) ?? null
      })
      .then((c) => {
        if (active && c) setClient(c)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  async function signOut() {
    setSigningOut(true)
    try {
      await fetch("/api/portal/logout", { method: "POST", credentials: "same-origin" })
    } finally {
      setSigningOut(false)
      navigate("/login", { replace: true })
    }
  }

  if (!client) return null

  return (
    <div className="mb-8 flex flex-col gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Signed in as <span className="font-medium text-foreground">{client.name}</span>
        {client.company ? ` · ${client.company}` : ""} · {client.tier}
      </p>
      <Button variant="ghost" size="sm" onClick={signOut} disabled={signingOut}>
        <LogOut className="h-4 w-4" />
        {signingOut ? "Signing out" : "Sign out"}
      </Button>
    </div>
  )
}
