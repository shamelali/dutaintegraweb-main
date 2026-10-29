import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"

import { PortalLoginPage } from "@/pages/portal-login"

/** The page navigates, so it needs a router with the routes it can land on. */
function renderAt(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/login" element={<PortalLoginPage />} />
        <Route path="/portal/proposals" element={<div>proposals page</div>} />
        <Route path="/portal/digests" element={<div>digest page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function okResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({ ok: true, client: { name: "Nurul Aisyah" } }),
  }
}

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } })
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } })
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }))
}

describe("PortalLoginPage", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue(okResponse() as unknown as Response)
  })

  it("posts the credentials to the portal login route with same-origin cookies", async () => {
    renderAt("/login")
    fillAndSubmit("nurul@example-client.my", "DemoPassw0rd!23")

    await screen.findByText("proposals page")
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe("/api/portal/login")
    expect(init.method).toBe("POST")
    // The session cookie is the only proof of who this client is. Without
    // same-origin the browser never sends it and every portal page 401s.
    expect(init.credentials).toBe("same-origin")
    expect(JSON.parse(init.body)).toEqual({
      email: "nurul@example-client.my",
      password: "DemoPassw0rd!23",
    })
  })

  it("returns the client to the page that bounced them", async () => {
    renderAt("/login?next=%2Fportal%2Fdigests")
    fillAndSubmit("a@b.my", "secret")

    await screen.findByText("digest page")
  })

  it("ignores a next= that points outside the portal", async () => {
    renderAt("/login?next=https%3A%2F%2Fevil.example%2Fsteal")
    fillAndSubmit("a@b.my", "secret")

    await screen.findByText("proposals page")
    expect(document.querySelector("a[href*='evil.example']")).toBeNull()
  })

  it("shows the server's reason instead of navigating", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Email or password is wrong." }),
    } as unknown as Response)

    renderAt("/login")
    fillAndSubmit("nurul@example-client.my", "wrong")

    expect(await screen.findByRole("alert")).toBeTruthy()
    expect(screen.getByRole("alert").textContent).toContain("Email or password is wrong.")
    expect(screen.queryByText("proposals page")).toBeNull()
  })

  it("says something useful when the network fails", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))

    renderAt("/login")
    fillAndSubmit("nurul@example-client.my", "anything")

    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Could not reach the server"))
  })
})
