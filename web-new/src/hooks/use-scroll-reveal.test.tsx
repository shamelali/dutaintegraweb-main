import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

import { useScrollReveal } from "./use-scroll-reveal"

function Probe() {
  const ref = useScrollReveal<HTMLDivElement>()
  return (
    <div ref={ref}>
      <p className="reveal">Managed IT services</p>
      <p className="reveal">Cybersecurity</p>
    </div>
  )
}

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("useScrollReveal", () => {
  it("reveals everything when the browser has no IntersectionObserver", () => {
    // index.html arms the hidden start state with a class. If the observer that
    // clears it does not exist, those sections stay at opacity 0 all visit.
    stubMatchMedia(false)
    expect("IntersectionObserver" in globalThis).toBe(false)

    render(<Probe />)

    for (const text of ["Managed IT services", "Cybersecurity"]) {
      expect(screen.getByText(text).classList.contains("visible")).toBe(true)
    }
  })

  it("reveals descendants, not only the container, under reduced motion", () => {
    stubMatchMedia(true)
    render(<Probe />)

    expect(screen.getByText("Cybersecurity").classList.contains("visible")).toBe(true)
  })
})

describe("the scroll-reveal styles", () => {
  const stripComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "")

  it("only hides .reveal once JavaScript has armed the page", () => {
    const css = stripComments(readFileSync(resolve(import.meta.dirname, "../index.css"), "utf8"))

    // A bare `.reveal { opacity: 0 }` hides content from every client that does
    // not run the bundle — crawlers, prints, and a failed script load.
    const hiding = css
      .split("}")
      .map((block) => `${block}}`)
      .filter((block) => {
        const selector = block.slice(0, block.indexOf("{")).trim()
        return selector === ".reveal" && /opacity:\s*0(?![.\d])/.test(block)
      })

    expect(hiding).toEqual([])
    expect(css).toMatch(/\.js-reveal \.reveal\s*\{[^}]*opacity:\s*0/)
  })

  it("arms the page from index.html, before the stylesheet paints", () => {
    const html = readFileSync(resolve(import.meta.dirname, "../../index.html"), "utf8")
    expect(html).toMatch(/classList\.add\("js-reveal"\)/)
    expect(html.indexOf('classList.add("js-reveal")')).toBeLessThan(html.indexOf("</head>"))
  })
})
