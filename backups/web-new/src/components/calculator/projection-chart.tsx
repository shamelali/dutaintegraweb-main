import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js"
import type { MonthProjection } from "@/lib/calculator-types"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

interface ProjectionChartProps {
  projections: MonthProjection[]
  companyName: string
}

export function ProjectionChart({ projections, companyName }: ProjectionChartProps) {
  const labels = projections.map((p) => `Mo ${p.month}`)

  const data = {
    labels,
    datasets: [
      {
        label: "Revenue (with DI)",
        data: projections.map((p) => p.diRevenue),
        borderColor: "#00B4FF",
        backgroundColor: "rgba(0, 180, 255, 0.08)",
        fill: true,
        tension: 0.3,
        pointRadius: projections.length > 24 ? 0 : 3,
        pointHoverRadius: 5,
        borderWidth: 2.5,
      },
      {
        label: "Revenue (do nothing)",
        data: projections.map((p) => p.nothingRevenue),
        borderColor: "#FF6B6B",
        backgroundColor: "rgba(255, 107, 107, 0.05)",
        fill: true,
        tension: 0.3,
        pointRadius: projections.length > 24 ? 0 : 3,
        pointHoverRadius: 5,
        borderWidth: 1.5,
        borderDash: [6, 4],
      },
      {
        label: "Profit (with DI)",
        data: projections.map((p) => p.diProfit),
        borderColor: "#4CAF50",
        backgroundColor: "rgba(76, 175, 80, 0.06)",
        fill: true,
        tension: 0.3,
        pointRadius: projections.length > 24 ? 0 : 3,
        pointHoverRadius: 5,
        borderWidth: 2,
      },
      {
        label: "Profit (do nothing)",
        data: projections.map((p) => p.nothingProfit),
        borderColor: "#FF9800",
        backgroundColor: "rgba(255, 152, 0, 0.04)",
        fill: false,
        tension: 0.3,
        pointRadius: projections.length > 24 ? 0 : 3,
        pointHoverRadius: 5,
        borderWidth: 1.5,
        borderDash: [6, 4],
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          color: "#8A9BB5",
          usePointStyle: true,
          pointStyle: "circle",
          padding: 16,
          font: { size: 12, family: "DM Sans" },
        },
      },
      title: {
        display: true,
        text: `${companyName} — Growth Projection`,
        color: "#F8FAFF",
        font: { size: 16, weight: "bold" as const, family: "Syne" },
        padding: { bottom: 20 },
      },
      tooltip: {
        backgroundColor: "#0B1D3A",
        titleColor: "#F8FAFF",
        bodyColor: "#8A9BB5",
        borderColor: "rgba(0, 180, 255, 0.3)",
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        titleFont: { weight: "bold" as const },
        callbacks: {
          label: (ctx: any) => {
            const val = ctx.parsed.y
            return ` ${ctx.dataset.label}: RM ${val.toLocaleString("en-MY", { maximumFractionDigits: 0 })}`
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(255,255,255,0.04)" },
        ticks: { color: "#8A9BB5", font: { size: 11 } },
      },
      y: {
        grid: { color: "rgba(255,255,255,0.06)" },
        ticks: {
          color: "#8A9BB5",
          font: { size: 11 },
          callback: (val: any) => `RM ${(val / 1000).toFixed(0)}K`,
        },
      },
    },
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 md:p-6">
      <div className="h-[350px] md:h-[420px]">
        <Line data={data} options={options as any} />
      </div>
    </div>
  )
}
