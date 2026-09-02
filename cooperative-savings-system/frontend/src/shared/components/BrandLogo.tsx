import { Box, useTheme, type BoxProps } from '@mui/material'

/**
 * Canonical UI wordmark paths. Current files are temporary raster brand assets
 * with baked-in black plates. Replace them with official transparent SVG or
 * high-resolution PNG wordmarks from the brand owner. React UI must use
 * BrandLogo — do not import these files in components.
 */
export const BRAND_LOGO_SRC = '/branding/ouwealth-community-logo.png'
export const BRAND_LOGO_ON_DARK_SRC = '/branding/ouwealth-community-logo-on-dark.png'
export const BRAND_LOGO_ALT = 'OuWealth Community'

export function resolveBrandLogoSrc(onDark: boolean): string {
  return onDark ? BRAND_LOGO_ON_DARK_SRC : BRAND_LOGO_SRC
}

interface BrandLogoProps {
  /** Height in pixels. Width follows the image aspect ratio. */
  size?: number
  variant?: 'compact' | 'full'
  animate?: boolean
  /**
   * True when the surrounding surface is dark (always-black AppBar, dark drawer,
   * dark auth canvas). Explicit value wins over theme-mode inference.
   */
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
  const useOnDarkAsset = onDark ?? theme.palette.mode === 'dark'
  const isFull = variant === 'full'

  return (
    <Box
      className={animate ? 'brand-logo-enter' : undefined}
      sx={{
        flexShrink: 0,
        lineHeight: 0,
        display: 'inline-flex',
        p: 0,
        m: 0,
        border: 0,
        borderRadius: 0,
        overflow: 'visible',
        opacity: 1,
        backgroundColor: 'transparent',
        maxWidth: isFull ? { xs: 'min(100%, 320px)', sm: 380 } : { xs: 176, sm: 210 },
        ...sx,
      }}
    >
      <Box
        component="img"
        src={resolveBrandLogoSrc(useOnDarkAsset)}
        alt={label}
        sx={{
          display: 'block',
          height: isFull ? { xs: 56, sm: 72 } : size,
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
          objectPosition: 'left center',
          backgroundColor: 'transparent',
          border: 0,
          borderRadius: 0,
          p: 0,
          m: 0,
        }}
      />
    </Box>
  )
}
