import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

const VARIANTS = {
  primary: 'bg-console-accent text-slate-950 font-semibold hover:bg-yellow-400 active:bg-yellow-500 border border-yellow-500/50 shadow-xs',
  secondary: 'bg-console-raised hover:bg-slate-800 text-console-text border border-console-border hover:border-console-border-strong',
  accent: 'bg-blue-600 hover:bg-blue-500 text-white font-medium border border-blue-500/60 shadow-xs',
  danger: 'bg-rose-950/60 hover:bg-rose-900/80 text-rose-200 border border-rose-800/80',
  ghost: 'bg-transparent hover:bg-slate-800/60 text-console-muted hover:text-console-text border border-transparent',
  outline: 'bg-transparent hover:bg-slate-800/40 text-console-text border border-console-border hover:border-console-border-strong',
}

const SIZES = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-xs tracking-wide gap-2',
  lg: 'h-10 px-4 text-sm tracking-wide gap-2.5',
  icon: 'h-8 w-8 p-0 flex items-center justify-center',
}

export const Button = forwardRef(function Button(
  {
    children,
    variant = 'secondary',
    size = 'md',
    className = '',
    disabled = false,
    loading = false,
    icon: Icon,
    iconPosition = 'left',
    type = 'button',
    ...props
  },
  ref
) {
  const variantClass = VARIANTS[variant] || VARIANTS.secondary
  const sizeClass = SIZES[size] || SIZES.md

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-sans uppercase font-medium rounded-none transition-colors duration-150 select-none cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-console-accent ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        Icon && iconPosition === 'left' && <Icon className="h-3.5 w-3.5 shrink-0" />
      )}
      {children && <span>{children}</span>}
      {!loading && Icon && iconPosition === 'right' && <Icon className="h-3.5 w-3.5 shrink-0" />}
    </button>
  )
})

export default Button
