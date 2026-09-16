import { useState, useEffect, useCallback } from "react"
import { translations, type Language, type TranslationKey } from "@/i18n/translations"

export function useLanguage() {
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("language") as Language) || "en"
    }
    return "en"
  })

  useEffect(() => {
    localStorage.setItem("language", lang)
  }, [lang])

  const toggle = useCallback(() => {
    setLang((prev) => (prev === "en" ? "bm" : "en"))
  }, [])

  const t = useCallback(
    (key: TranslationKey): string => {
      return translations[key]?.[lang] || translations[key]?.en || key
    },
    [lang]
  )

  return { lang, toggle, t }
}
