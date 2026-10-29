import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"

import { NotFoundPage } from "@/pages/not-found"

describe("NotFoundPage", () => {
  it("tells the visitor the page is gone and offers a way back", () => {
    render(
      <MemoryRouter initialEntries={["/definitely-not-real"]}>
        <Routes>
          <Route path="*" element={<NotFoundPage />} />
          <Route path="/" element={<div>home page</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Page not found")
    expect(screen.getByRole("link", { name: "Back to home" }).getAttribute("href")).toBe("/")
    expect(screen.getByRole("link", { name: "Contact us" }).getAttribute("href")).toBe("/contact")
  })
})
