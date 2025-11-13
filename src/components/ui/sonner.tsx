/**
 * @description
 * This file defines the Toaster component which is a wrapper around the `sonner` library.
 * It is responsible for rendering toast notifications in the application.
 * The component is theme-aware and adjusts its appearance based on the current theme (light/dark)
 * provided by `next-themes`.
 *
 * @dependencies
 * - next-themes: For accessing the current theme.
 * - sonner: The underlying toast notification library.
 *
 * @exports
 * - Toaster: The configured Sonner component for the application.
 */
"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
