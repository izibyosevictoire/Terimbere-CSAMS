import HandshakeIcon from '@mui/icons-material/Handshake'
import { Box, type BoxProps } from '@mui/material'

interface BrandLogoProps {
  size?: number
  sx?: BoxProps['sx']
}

/** Handshake mark for cooperative partnership — blue square, white icon. */
export function BrandLogo({ size = 32, sx }: BrandLogoProps) {
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: size > 40 ? '12px' : '8px',
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        ...sx,
      }}
    >
      <HandshakeIcon sx={{ fontSize: size * 0.62, color: 'inherit' }} />
    </Box>
  )
}
