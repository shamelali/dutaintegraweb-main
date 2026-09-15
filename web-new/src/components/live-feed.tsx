import { useState, useEffect, useCallback } from "react"
import {
  Shield,
  Server,
  Database,
  RefreshCw,
  HardDrive,
  Lock,
  Cpu,
  Users,
  AlertTriangle,
  Wifi,
  CheckCircle2,
} from "lucide-react"

interface FeedEvent {
  id: number
  icon: typeof Shield
  title: string
  region: string
  industry: string
  severity: "info" | "warning" | "error"
  timeLabel: string
}

const EVENT_POOL: Omit<FeedEvent, "id" | "timeLabel">[] = [
  {
    icon: Shield,
    title: "Blocked brute-force attack on SSH",
    region: "Cyberjaya",
    industry: "Manufacturing",
    severity: "error",
  },
  {
    icon: Server,
    title: "Auto-scaled web-cluster +2 compute units",
    region: "Kuala Lumpur",
    industry: "Finance",
    severity: "info",
  },
  {
    icon: Database,
    title: "Optimized query cache — 340ms → 12ms",
    region: "Penang",
    industry: "Retail",
    severity: "info",
  },
  {
    icon: RefreshCw,
    title: "Patched CVE-2026-4821 across 12 instances",
    region: "Johor Bahru",
    industry: "Logistics",
    severity: "warning",
  },
  {
    icon: HardDrive,
    title: "Reclaimed 18 GB orphaned disk volume",
    region: "Kota Kinabalu",
    industry: "Healthcare",
    severity: "info",
  },
  {
    icon: Lock,
    title: "Renewed SSL cert — api.client.my (14d early)",
    region: "Shah Alam",
    industry: "Education",
    severity: "info",
  },
  {
    icon: Cpu,
    title: "Resolved memory leak in worker-pool-07",
    region: "Cyberjaya",
    industry: "SaaS",
    severity: "warning",
  },
  {
    icon: AlertTriangle,
    title: "AWS bill anomaly detected — RM 2,400 spike",
    region: "Kuala Lumpur",
    industry: "E-commerce",
    severity: "error",
  },
  {
    icon: CheckCircle2,
    title: "Backup verified — db-primary (2.1 TB, 99.97%)",
    region: "Ipoh",
    industry: "Manufacturing",
    severity: "info",
  },
  {
    icon: Users,
    title: "Revoked 3 stale IAM credentials",
    region: "Melaka",
    industry: "Hospitality",
    severity: "warning",
  },
  {
    icon: Wifi,
    title: "Failover to secondary DC — 0 downtime",
    region: "Kuantan",
    industry: "Energy",
    severity: "info",
  },
  {
    icon: Shield,
    title: "Contained lateral movement attempt",
    region: "Petaling Jaya",
    industry: "Finance",
    severity: "error",
  },
]

const TIME_LABELS = ["just now", "1m ago", "2m ago", "4m ago", "6m ago", "9m ago", "12m ago", "15m ago"]

const SEVERITY_STYLES: Record<string, string> = {
  info: "bg-electric/10 text-electric",
  warning: "bg-amber-500/15 text-amber-400",
  error: "bg-red-500/15 text-red-400",
}

let nextId = 1

function pickEvents(count: number): FeedEvent[] {
  const shuffled = [...EVENT_POOL].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count).map((ev, i) => ({
    ...ev,
    id: nextId++,
    timeLabel: TIME_LABELS[i] || `${i * 3}m ago`,
  }))
}

export function LiveFeed() {
  const [events, setEvents] = useState<FeedEvent[]>(() => pickEvents(5))

  const rotate = useCallback(() => {
    setEvents((prev) => {
      const newEvents = [...prev]
      // Remove oldest, add new random at top
      newEvents.pop()
      const pool = EVENT_POOL.filter((p) => !newEvents.some((e) => e.title === p.title))
      const pick = pool[Math.floor(Math.random() * pool.length)] || EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)]
      newEvents.unshift({
        ...pick,
        id: nextId++,
        timeLabel: "just now",
      })
      // Shift time labels
      return newEvents.map((ev, i) => ({
        ...ev,
        timeLabel: TIME_LABELS[i] || `${i * 3}m ago`,
      }))
    })
  }, [])

  useEffect(() => {
    const interval = setInterval(rotate, 6000)
    return () => clearInterval(interval)
  }, [rotate])

  return (
    <div className="w-full max-w-2xl mx-auto reveal reveal-delay-3">
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400" />
            </span>
            <span className="text-xs font-semibold text-white/80">Live</span>
          </div>
          <span className="text-[11px] text-white/30 tabular-nums">
            {events.length} events
          </span>
        </div>

        {/* Events */}
        <div className="divide-y divide-white/5">
          {events.map((ev, i) => (
            <div
              key={ev.id}
              className="feed-item flex items-start gap-3 px-5 py-3"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Icon */}
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-electric/10 flex items-center justify-center">
                <ev.icon className="w-4 h-4 text-electric" />
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white/90 font-medium leading-snug">
                  {ev.title}
                </div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="text-[11px] text-white/35">
                    {ev.region} · {ev.industry}
                  </span>
                  <span className="text-[11px] text-white/25">·</span>
                  <span className="text-[11px] text-white/35">{ev.timeLabel}</span>
                  <span
                    className={`ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${SEVERITY_STYLES[ev.severity]}`}
                  >
                    {ev.severity}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
