import React from 'react'
import { cn } from '@/lib/utils'

const Label = React.forwardRef(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      'text-xs font-semibold text-ink dark:text-ink-dark leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 select-none',
      className
    )}
    {...props}
  />
))
Label.displayName = 'Label'

export { Label }

