/**
 * @description
 * This component is responsible for rendering the toasts that are managed by the `useToast` hook.
 * It iterates over the active toasts and renders them within a `ToastViewport`.
 *
 * @dependencies
 * - @/hooks/use-toast: The hook that provides the toast state and actions.
 * - @/components/ui/toast: The building block components for displaying a toast.
 *
 * @exports
 * - Toaster: The component that renders all active toasts.
 */
"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  type ToastActionElement,
  type ToastProps,
} from "@/components/ui/toast"
import { useToast } from "../../hooks/use-toast"


export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }: {
        id: string;
        title?: React.ReactNode;
        description?: React.ReactNode;
        action?: ToastActionElement;
        props?: ToastProps;
      }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
