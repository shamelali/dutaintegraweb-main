import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"

import { PortalAccountBar } from "@/components/portal-account-bar"

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as unknown as Response
}

function renderBar() {
  return render(
    <MemoryRouter initialEntries={["/portal/proposals"]}>
      <Routes>
        <Route
          path="/portal/proposals"
          element={
            <div>
              <PortalAccountBar />
              <h1>My Proposals</h1>
            </div>
          }
        />
        <Route path="/login" element={<div>sign-in page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe("PortalAccountBar", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(async (url: string) => {
      if (url === "/api/portal/me") {
        return jsonResponse({ ok: true, client: { name: "Nurul Aisyah", email: "n@x.my", company: "Example Client Sdn Bhd", tier: "growth" } })
      }
      return jsonResponse({ ok: true })
    }) as unknown as typeof fetch
  })

  it("names the signed-in client and their tier", async () => {
    renderBar()
    const strip = await screen.findByText(/Signed in as/)
    expect(strip.textContent).toContain("Nurul Aisyah")
    expect(strip.textContent).toContain("Example Client Sdn Bhd")
    expect(strip.textContent).toContain("growth")
  })

  it("gives a signed-out visitor an end to their session", async () => {
    renderBar()
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }))

    await waitFor(() => expect(screen.getByText("sign-in page")).toBeTruthy())
    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls
    expect(calls.some(([url, init]) => url === "/api/portal/logout" && init?.method === "POST")).toBe(true)
  })

  it("stays hidden when there is no session, so portal pages do not show an empty strip", async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ error: "Not authenticated" }, false, 401)) as unknown as typeof fetch
    const { container } = renderBar()

    await waitFor(() => expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0))
    expect(container.textContent).toBe("My Proposals")
  })
})
