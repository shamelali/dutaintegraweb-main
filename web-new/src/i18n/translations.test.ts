import { describe, expect, it } from "vitest"

import { translations, type Language } from "./translations"

const LANGUAGES: Language[] = ["en", "bm"]
const entries = Object.entries(translations) as [string, Record<Language, string>][]

describe("translations", () => {
  it("defines every language for every key", () => {
    const missing: string[] = []
    for (const [key, values] of entries) {
      for (const language of LANGUAGES) {
        if (!values[language]?.trim()) missing.push(`${key}.${language}`)
      }
    }
    expect(missing).toEqual([])
  })

  it("keeps the nav keys the navbar builds its links from", () => {
    for (const key of ["navServices", "navAbout", "navPricing", "navContact", "navPortal"]) {
      expect(translations, `${key} must exist or the navbar renders the raw key`).toHaveProperty(key)
    }
  })
})
