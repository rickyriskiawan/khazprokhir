import React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-pitch text-white hover:bg-pitch-hover dark:bg-white dark:text-pitch dark:hover:bg-slate-200 shadow-sm',
        emerald:
          'bg-emerald text-white hover:bg-emerald/90 shadow-sm',
        destructive:
          'bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-900 dark:text-rose-100 dark:hover:bg-rose-800',
        outline:
          'border border-border bg-surface hover:bg-surface-subtle text-ink dark:border-border-dark dark:bg-surface-dark dark:hover:bg-surface-subtle-dark dark:text-ink-dark',
        secondary:
          'bg-surface-subtle text-ink hover:bg-border/60 dark:bg-surface-subtle-dark dark:text-ink-dark dark:hover:bg-border-dark/60',
        ghost:
          'hover:bg-surface-subtle text-ink dark:text-ink-dark dark:hover:bg-surface-subtle-dark',
        link: 'text-pitch dark:text-white underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-11 rounded-xl px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = 'Button'

export { Button, buttonVariants }

