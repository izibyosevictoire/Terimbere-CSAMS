import { Box, type BoxProps } from '@mui/material'

export const BRAND_LOGO_SRC = '/branding/ouwealth-community-logo.jpg'
export const BRAND_LOGO_ALT = 'OuWealth Community'

interface BrandLogoProps {
  /** Height in pixels. Width follows the image aspect ratio. */
  size?: number
  /** `full` is for auth/entry; `compact` is for the app bar and drawer. */
  variant?: 'compact' | 'full'
  animate?: boolean
  sx?: BoxProps['sx']
}

export function BrandLogo({
  size = 32,
  variant = 'compact',
  animate = false,
  sx,
}: BrandLogoProps) {
  const isFull = variant === 'full'
  return (
    <Box
      className={animate ? 'brand-logo-enter' : undefined}
      sx={{
        flexShrink: 0,
        lineHeight: 0,
        maxWidth: isFull ? { xs: 'min(100%, 280px)', sm: 340 } : { xs: 140, sm: 168 },
        ...sx,
      }}
    >
      <Box
        component="img"
        src={BRAND_LOGO_SRC}
        alt={BRAND_LOGO_ALT}
        sx={{
          display: 'block',
          height: isFull ? { xs: 56, sm: 72 } : size,
          width: 'auto',
          maxWidth: '100%',
          maxHeight: isFull ? { xs: 56, sm: 72 } : size,
          objectFit: 'contain',
          objectPosition: 'left center',
        }}
      />
    </Box>
  )
}
