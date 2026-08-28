import { Box, useTheme, type BoxProps } from '@mui/material'

export const BRAND_LOGO_SRC = '/branding/ouwealth-community-logo.png'
export const BRAND_LOGO_ON_DARK_SRC = '/branding/ouwealth-community-logo-on-dark.png'
export const BRAND_LOGO_ALT = 'OuWealth Community'

interface BrandLogoProps {
  /** Height in pixels. Width follows the image aspect ratio. */
  size?: number
  variant?: 'compact' | 'full'
  animate?: boolean
  /** Light-ink asset for the always-black app bar. */
  onDark?: boolean
  label?: string
  sx?: BoxProps['sx']
}

export function BrandLogo({
  size = 40,
  variant = 'compact',
  animate = false,
  onDark,
  label = BRAND_LOGO_ALT,
  sx,
}: BrandLogoProps) {
  const theme = useTheme()
  const invert = onDark ?? theme.palette.mode === 'dark'
  const isFull = variant === 'full'

  return (
    <Box
      className={animate ? 'brand-logo-enter' : undefined}
      sx={{
        flexShrink: 0,
        lineHeight: 0,
        display: 'inline-flex',
        background: 'transparent',
        maxWidth: isFull ? { xs: 'min(100%, 320px)', sm: 380 } : { xs: 176, sm: 210 },
        ...sx,
      }}
    >
      <Box
        component="img"
        src={invert ? BRAND_LOGO_ON_DARK_SRC : BRAND_LOGO_SRC}
        alt={label}
        sx={{
          display: 'block',
          height: isFull ? { xs: 56, sm: 72 } : size,
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
          backgroundColor: 'transparent',
        }}
      />
    </Box>
  )
}
