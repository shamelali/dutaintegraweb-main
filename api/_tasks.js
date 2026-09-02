// ============================================================================
// Daily task checklists — canonical copy used by the ops automation.
//
// Server-side source of truth for the 08:00 MYT Slack checklist cron
// (`api/cron/daily-tasks.js`). The admin panel (`js/admin.js` → TASKS) keeps
// its own client-side copy for in-dashboard display — keep both in sync when
// times or tasks change.
// ============================================================================

export const DAILY_TASKS = {
  technical: [
    { time: "8:00 AM", text: "Review active projects & tickets, prioritize blockers", cat: "planning" },
    { time: "8:30 AM", text: "Respond to urgent client messages & WhatsApp", cat: "comms" },
    { time: "9:00 AM", text: "Check server uptime, monitoring alerts, CI/CD pipelines", cat: "ops" },
    { time: "9:30 AM", text: "Technical delivery — dev, deployments, migrations", cat: "delivery" },
    { time: "12:00 PM", text: "Lunch break", cat: "break" },
    { time: "1:00 PM", text: "Client-facing — demos, consultations, scope calls", cat: "comms" },
    { time: "3:00 PM", text: "Code review, PR merges, documentation updates", cat: "delivery" },
    { time: "4:00 PM", text: "Security checks — patches, access reviews, backups", cat: "ops" },
    { time: "4:30 PM", text: "Update project boards, document shipped work, flag risks", cat: "planning" },
    { time: "5:00 PM", text: "End-of-day sync with Amar", cat: "comms" },
  ],
  operations: [
    { time: "8:00 AM", text: "Review pipeline — follow up on warm leads & inquiries", cat: "planning" },
    { time: "8:30 AM", text: "Respond to emails, WhatsApp, website form submissions", cat: "comms" },
    { time: "9:00 AM", text: "Business development — outreach, networking, LinkedIn", cat: "sales" },
    { time: "9:30 AM", text: "Proposal writing & quotation follow-ups", cat: "sales" },
    { time: "11:00 AM", text: "Marketing — social media posts, content, blog updates", cat: "marketing" },
    { time: "12:00 PM", text: "Lunch break", cat: "break" },
    { time: "1:00 PM", text: "Operations — invoicing, vendor coordination, admin", cat: "ops" },
    { time: "2:00 PM", text: "Client relationship — check in, gather feedback", cat: "comms" },
    { time: "3:00 PM", text: "Financial tracking — expenses, payments, cash flow", cat: "ops" },
    { time: "4:00 PM", text: "Update CRM/pipeline, prepare tomorrow outreach list", cat: "planning" },
    { time: "5:00 PM", text: "End-of-day sync with Shamel", cat: "comms" },
  ],
};

export const TASK_LABELS = {
  technical: "Technical (Shamel)",
  operations: "Operations (Amar)",
};

export function checklistMessage(role, dateLabel) {
  const list = DAILY_TASKS[role] || [];
  const heading = `${TASK_LABELS[role]} — ${dateLabel}`;
  const items = list.map((t) => `☐ \`${t.time}\` — ${t.text}`).join("\n");
  return `${heading}\n\n${items}`;
}