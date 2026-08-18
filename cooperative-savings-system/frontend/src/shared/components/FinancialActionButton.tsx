import { Button, Tooltip, type ButtonProps } from '@mui/material'
import {
  useFinancialSubmitGuard,
  type FinancialSubmitGuard,
} from '@/shared/hooks/useFinancialSubmitGuard'

type FinancialActionButtonProps = ButtonProps & {
  /** When true, also disable if public health check fails. */
  requireServerReachable?: boolean
  /** Optional override of guard (e.g. shared parent hook). */
  guard?: FinancialSubmitGuard
}

/**
 * Submit/action button that disables when offline (and optionally when the server is unreachable).
 */
export function FinancialActionButton({
  requireServerReachable = false,
  guard: guardProp,
  disabled,
  children,
  ...rest
}: FinancialActionButtonProps) {
  const localGuard = useFinancialSubmitGuard({ requireServerReachable })
  const guard = guardProp ?? localGuard
  const blocked = !guard.canSubmit
  const title = blocked ? (guard.reason ?? undefined) : undefined

  const button = (
    <Button {...rest} disabled={disabled || blocked}>
      {children}
    </Button>
  )

  if (!title) return button

  return (
    <Tooltip title={title}>
      <span style={{ display: 'inline-flex' }}>{button}</span>
    </Tooltip>
  )
}
