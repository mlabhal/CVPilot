import * as React from "react"

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive"
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={`rounded-lg border p-4 ${
        variant === "destructive" ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 bg-gray-50"
      }`}
      {...props}
    />
  )
)
Alert.displayName = "Alert"

export const AlertTitle = React.forwardRef<HTMLParagraphElement, AlertProps>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className="mb-1 font-medium leading-none tracking-tight"
      {...props}
    />
  )
)
AlertTitle.displayName = "AlertTitle"

export const AlertDescription = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className="text-sm [&_p]:leading-relaxed"
      {...props}
    />
  )
)
AlertDescription.displayName = "AlertDescription"