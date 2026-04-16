import { cn } from '@/lib/utils'

interface PageContainerProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

export function PageContainer({ children, title, subtitle, actions, className }: PageContainerProps) {
  return (
    <div className={cn('p-4 lg:p-6 max-w-6xl mx-auto', className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            {title && <h1 className="page-title">{title}</h1>}
            {subtitle && <p className="page-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
