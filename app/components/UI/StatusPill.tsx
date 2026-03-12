import { CheckCircle, LoaderCircle, Pickaxe, TriangleAlert, XCircle } from "lucide-react"
import LoaderIcon from "./Icons/LoaderIcon"

const colorClasses = {
  red: "bg-red-500/30 dark:bg-red-600/30 text-red-500 border-red-500",
  blue: "bg-blue-500/30 dark:bg-blue-600/30 text-blue-500 border-blue-500",
  green: "bg-emerald-500/30 dark:bg-emerald-600/30 text-green-500 border-green-500",
  yellow: "bg-amber-500/30 dark:bg-amber-600/30 text-amber-500 border-amber-500",
}
const colorIcons = {
  red: XCircle,
  blue: LoaderIcon,
  green: CheckCircle,
  yellow: TriangleAlert,
}

export default function StatusPill({
  status,
  color,
}: {
  status: string
  color: "red" | "blue" | "green" | "yellow"
}) {
  const Icon = colorIcons[color]
  return (
    <span className={`m-2 border px-2 py-1 rounded-md inline-flex items-center justify-center ${colorClasses[color]}`}>
      <Icon className="w-3 h-3 mr-1" />
      <p className="whitespace-nowrap text-[12px] capitalize">{status}</p>
    </span>
  )
}