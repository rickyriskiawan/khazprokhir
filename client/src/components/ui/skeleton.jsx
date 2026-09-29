import React from 'react'
import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('animate-pulse rounded-xl bg-pitch/5 dark:bg-white/10', className)}
      {...props}
    />
  )
}

export { Skeleton }
