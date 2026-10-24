/**
 * Duta Integra brand logo — inline SVG (no extra request, scales losslessly).
 *
 * Geometry and palette come from the official brand SVGs
 * (web-new/public/logo-light.svg, logo-dark.svg, icon.svg, logo-stacked.svg):
 *   Duta Blue    #1E3A6E
 *   Integra Orange #E85D26
 *
 * variant "light"  → blue wordmark, for light backgrounds (navbar in light mode)
 * variant "dark"   → white wordmark, for dark surfaces (footer, navbar in dark mode)
 *
 * `withTagline` shows the BM tagline strip; keep it off below ~40px height
 * where 11px scaled text turns into noise (navbar), on for larger placements
 * (footer).
 */
interface LogoProps {
  variant?: "light" | "dark"
  withTagline?: boolean
  className?: string
}

export function Logo({ variant = "light", withTagline = false, className }: LogoProps) {
  const base = variant === "dark" ? "#FFFFFF" : "#1E3A6E"
  const accent = "#E85D26"
  const taglineColor = variant === "dark" ? "#94A3B8" : "#64748B"
  const fonts = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
  // Without the tagline strip, drop the baseline so the wordmark optically
  // centers against the icon mark instead of hugging the top.
  const groupY = withTagline ? 35 : 58

  return (
    <svg viewBox="0 0 400 100" className={className} role="img" aria-label="Duta Integra">
      <g transform="translate(10, 15)">
        <path
          d="M15,0 L45,0 C60,0 70,15 70,35 C70,55 60,70 45,70 L15,70 L15,55 L45,55 C52,55 55,48 55,35 C55,22 52,15 45,15 L15,15 Z"
          fill={base}
        />
        <path
          d="M0,15 L0,55 C0,65 8,70 15,70 L15,55 C12,55 10,52 10,45 L10,25 C10,18 12,15 15,15 Z"
          fill={accent}
        />
      </g>
      <g transform={`translate(95, ${groupY})`}>
        <text fontFamily={fonts} fontWeight="800" fontSize="32" fill={base} letterSpacing="-0.5">
          dutaintegra<tspan fill={accent}>.my</tspan>
        </text>
        {withTagline && (
          <text
            x="2"
            y="28"
            fontFamily={fonts}
            fontWeight="500"
            fontSize="11"
            fill={taglineColor}
            letterSpacing="2"
          >
            SATU PLATFORM, PELUANG TANPA HAD
          </text>
        )}
      </g>
    </svg>
  )
}
