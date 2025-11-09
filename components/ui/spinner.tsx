'use client'

import { LineSpinner } from './line-spinner'
import { cn } from '@/lib/utils'

function Spinner({ className, size = '20', ...props }: React.ComponentProps<'div'> & { size?: string }) {
  return (
    <div 
      role="status" 
      aria-label="Loading" 
      className={cn('inline-flex items-center justify-center', className)}
      {...props}
    >
      <LineSpinner size={size} stroke="2" speed="1" />
    </div>
  )
}

export { Spinner }
