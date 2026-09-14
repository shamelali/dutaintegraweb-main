import * as React from "react"
import { cn } from "@/lib/utils"

interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  visible?: boolean
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, visible, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg bg-navy text-white font-medium shadow-lg transition-all duration-300",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none",
        className
      )}
      {...props}
    />
  )
)
Toast.displayName = "Toast"

export { Toast }
