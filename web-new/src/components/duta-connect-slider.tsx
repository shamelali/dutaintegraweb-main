import { ReactCompareSlider, ReactCompareSliderImage } from "react-compare-slider"
import { useLanguage } from "@/hooks/use-language"

/**
 * DutaConnectSlider — the "Before & After" drag comparison from the V2
 * Engineering Handoff Spec (§3). Uses react-compare-slider for built-in
 * mobile touch compatibility (no custom drag logic).
 *
 * NOTE: The spec referenced /images/before-messy-desktop.jpg and
 * /images/after-duta-dashboard.jpg. Those production screenshots are not in
 * the repo yet; we point at those paths but fall back to labelled SVG mock
 * panels via onError, so the section degrades gracefully until real assets
 * land in web-new/public/images/.
 */

// Lightweight inline SVG placeholders (data URIs) so the slider always has
// two visually distinct layers even before photography is available.
const beforePlaceholder =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='600'>
      <rect width='1200' height='600' fill='#cbd5e1'/>
      <g fill='#94a3b8'>
        ${Array.from({ length: 14 })
          .map((_, i) => `<rect x='${40 + (i % 7) * 165}' y='${60 + Math.floor(i / 7) * 240}' width='140' height='200' rx='8' transform='rotate(${(i % 5) * 3 - 6} ${110 + (i % 7) * 165} ${160 + Math.floor(i / 7) * 240})'/>`)
          .join("")}
      </g>
      <text x='600' y='320' font-family='sans-serif' font-size='42' font-weight='bold' fill='#475569' text-anchor='middle'>BEFORE — shipping chaos</text>
      <text x='600' y='370' font-family='sans-serif' font-size='24' fill='#64748b' text-anchor='middle'>12 tabs · 3 portals · sticky tape</text>
    </svg>`,
  )

const afterPlaceholder =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='600'>
      <rect width='1200' height='600' fill='#0f172a'/>
      <rect x='60' y='60' width='1080' height='90' rx='12' fill='#1e293b'/>
      <rect x='60' y='170' width='520' height='370' rx='12' fill='#1e293b'/>
      <rect x='600' y='170' width='540' height='175' rx='12' fill='#1e293b'/>
      <rect x='600' y='365' width='540' height='175' rx='12' fill='#1e293b'/>
      <circle cx='110' cy='105' r='22' fill='#00d4ff'/>
      <text x='600' y='320' font-family='sans-serif' font-size='42' font-weight='bold' fill='#e2e8f0' text-anchor='middle'>AFTER — one unified inbox</text>
      <text x='600' y='370' font-family='sans-serif' font-size='24' fill='#00d4ff' text-anchor='middle'>Duta Connect dashboard</text>
    </svg>`,
  )

const BEFORE_SRC = "/images/before-messy-desktop.jpg"
const AFTER_SRC = "/images/after-duta-dashboard.jpg"

/** Swap to an inline placeholder if the real screenshot hasn't shipped yet. */
function fallbackOnFail(e: React.SyntheticEvent<HTMLImageElement>, placeholder: string) {
  const img = e.currentTarget
  if (!img.dataset.fallbackApplied) {
    img.dataset.fallbackApplied = "1"
    img.src = placeholder
    img.removeAttribute("srcset")
  }
}

export function DutaConnectSlider() {
  const { t } = useLanguage()

  return (
    <section className="py-20 bg-light-bg dark:bg-slate-deep">
      <div className="max-w-5xl mx-auto px-6 text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
          {t("sliderTitle")}
        </h2>
        <p className="text-muted-foreground text-lg">{t("sliderSubtitle")}</p>
      </div>

      <div className="max-w-4xl mx-auto px-6">
        <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-700">
          <ReactCompareSlider
            handle={<Handle />}
            itemOne={
              <ReactCompareSliderImage
                src={BEFORE_SRC}
                alt={t("sliderAltBefore")}
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => fallbackOnFail(e, beforePlaceholder)}
              />
            }
            itemTwo={
              <ReactCompareSliderImage
                src={AFTER_SRC}
                alt={t("sliderAltAfter")}
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => fallbackOnFail(e, afterPlaceholder)}
              />
            }
            style={{ height: "clamp(280px, 50vw, 500px)" }}
          />
        </div>
      </div>
    </section>
  )
}

function Handle() {
  return (
    // min-h/w-[44px] keeps the drag handle a spec-compliant touch target (§5.3)
    <div className="flex items-center justify-center min-h-[44px] min-w-[44px] w-11 h-11 rounded-full bg-electric text-navy shadow-lg border-2 border-white select-none">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8 8l-4 4 4 4" />
        <path d="M16 8l4 4-4 4" />
      </svg>
    </div>
  )
}
