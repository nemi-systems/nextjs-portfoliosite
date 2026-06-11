import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'default' | 'outline' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const variants: Record<ButtonVariant, string> = {
  default: 'bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:text-neutral-500',
  outline: 'border border-black bg-white text-black hover:bg-neutral-100 disabled:border-neutral-300 disabled:text-neutral-400',
  ghost: 'bg-transparent text-black hover:bg-neutral-100 disabled:text-neutral-400',
}

export function Button({ className, variant = 'default', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold uppercase tracking-[0.14em] transition-colors disabled:cursor-not-allowed',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
