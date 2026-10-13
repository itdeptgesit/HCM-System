"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckCircle2, Info, AlertTriangle, AlertCircle, Loader2 } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />,
        info: <Info className="size-4 text-sky-600 dark:text-sky-400" />,
        warning: <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />,
        error: <AlertCircle className="size-4 text-rose-600 dark:text-rose-400" />,
        loading: <Loader2 className="size-4 animate-spin text-muted-foreground" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white dark:group-[.toaster]:bg-zinc-950 group-[.toaster]:text-slate-900 dark:group-[.toaster]:text-slate-100 group-[.toaster]:border-slate-200/90 dark:group-[.toaster]:border-zinc-800 group-[.toaster]:shadow-lg group-[.toaster]:shadow-black/5 group-[.toaster]:rounded-xl group-[.toaster]:p-4 group-[.toaster]:font-sans",
          title: "font-semibold text-xs text-slate-900 dark:text-slate-100 tracking-tight",
          description: "text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5",
          actionButton:
            "group-[.toast]:bg-slate-900 group-[.toast]:text-white dark:group-[.toast]:bg-slate-50 dark:group-[.toast]:text-slate-900 text-xs font-medium rounded-lg px-3 py-1.5",
          cancelButton:
            "group-[.toast]:bg-slate-100 group-[.toast]:text-slate-700 text-xs font-medium rounded-lg px-3 py-1.5",
          closeButton:
            "group-[.toast]:bg-white dark:group-[.toast]:bg-zinc-900 group-[.toast]:border group-[.toast]:border-slate-200 dark:group-[.toast]:border-zinc-800 group-[.toast]:text-slate-400 hover:group-[.toast]:text-slate-700 dark:hover:group-[.toast]:text-slate-200 group-[.toast]:rounded-md",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
