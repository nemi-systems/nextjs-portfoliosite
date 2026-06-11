import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-12 w-full rounded-full border border-black bg-white px-5 text-base outline-none transition-shadow placeholder:text-neutral-400 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.12)] disabled:cursor-not-allowed disabled:border-neutral-300 disabled:text-neutral-400',
        className,
      )}
      {...props}
    />
  )
}
