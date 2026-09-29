import React from 'react'
import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('animate-pulse rounded-xl bg-border/60 dark:bg-surface-subtle-dark', className)}
      {...props}
    />
  )
}

export { Skeleton }

