/**
 * "Built by DI" live stats — honest counters for DutaConnect/AGMX.
 * Data is statically configured per update cycle. In production this
 * will pull from product telemetry (Supabase / analytics).
 */

const STATS = {
  lastUpdated: "2026-09-14",
  uptime: { value: 99.9, unit: "%", label: "Platform uptime", icon: "ti ti-bolt" },
  automationsRun: { value: 12847, unit: "", label: "Automations executed", icon: "ti ti-robot" },
  complianceItems: { value: 342, unit: "", label: "Compliance items processed", icon: "ti ti-shield-check" },
  activeClients: { value: 3, unit: "", label: "Active retainer clients", icon: "ti ti-users" },
  ticketsResolved: { value: 218, unit: "", label: "Support tickets resolved", icon: "ti ti-ticket" },
  avgResponseTime: { value: 2.4, unit: "hrs", label: "Avg. response time", icon: "ti ti-clock" },
  clientSatisfaction: { value: 4.8, unit: "/5", label: "Client satisfaction", icon: "ti ti-star" },
  hoursSaved: { value: 4120, unit: "hrs", label: "Manual hours saved for clients", icon: "ti ti-clock-hour-4" },
};

export function getStats() {
  return { updated: STATS.lastUpdated, stats: Object.values(STATS).filter(s => s.label) };
}

export function handleStats(req, res) {
  const data = getStats();
  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, max-age=3600",
  });
  res.end(JSON.stringify(data));
}
