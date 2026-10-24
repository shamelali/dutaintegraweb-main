/**
 * Duta Integra brand lockup.
 *
 * The mark is the official raster badge (`public/mark.png`, extracted from
 * the brand banner — white "D" bowl, azure swooshes, orange bullet on navy).
 * The wordmark is live HTML so it stays crisp and theme-adaptive:
 *   variant "dark"  → white text, for dark surfaces (footer, dark navbar)
 *   variant "light" → foreground text, for light surfaces
 * Accent orange sampled from the banner: #F04E00.
 */
interface LogoProps {
  variant?: "light" | "dark"
  withTagline?: boolean
  className?: string
}

export function Logo({ variant = "light", withTagline = false, className }: LogoProps) {
  const word = variant === "dark" ? "text-white" : "text-foreground"
  const tag = variant === "dark" ? "text-white/50" : "text-muted-foreground"

  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <img
        src="/mark.png"
        alt=""
        className="h-10 w-10 shrink-0 rounded-[10px]"
        draggable={false}
      />
      <span className="flex flex-col leading-none">
        <span className={`font-heading text-xl font-extrabold tracking-tight ${word}`}>
          dutaintegra<span className="text-[#F04E00]">.my</span>
        </span>
        {withTagline && (
          <span className={`mt-1 text-[9px] font-semibold tracking-[0.18em] ${tag}`}>
            SATU PLATFORM, PELUANG TANPA HAD
          </span>
        )}
      </span>
    </span>
  )
}
