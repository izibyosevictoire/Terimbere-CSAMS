import { Box, useTheme, type BoxProps } from '@mui/material'
import { useId } from 'react'

export const BRAND_LOGO_ALT = 'OuWealth Community'

interface BrandLogoProps {
  /** Height in pixels. Width follows the logo aspect ratio. */
  size?: number
  variant?: 'compact' | 'full'
  animate?: boolean
  /** Light wordmark for the always-black app bar. */
  onDark?: boolean
  label?: string
  sx?: BoxProps['sx']
}

const ORANGE_ARC = 'M 75.14 25.77 A 38 38 0 1 1 31.6 28.06'

const U_PATHS = [
  'M 24.2 30 L 24.2 66.9 A 21.7 21.7 0 0 0 67.6 66.9 L 67.6 9.8',
  'M 28.35 30.35 L 28.35 69.36 A 18.96 18.96 0 0 0 66.28 69.36 L 66.28 10.92',
  'M 32.5 30.7 L 32.5 71.81 A 16.23 16.23 0 0 0 64.96 71.81 L 64.96 12.04',
  'M 36.65 31.05 L 36.65 74.26 A 13.5 13.5 0 0 0 63.64 74.26 L 63.64 13.16',
  'M 40.8 31.4 L 40.8 76.72 A 10.76 10.76 0 0 0 62.32 76.72 L 62.32 14.28',
]

const FONT =
  "Candara, Calibri, 'Segoe UI', 'Trebuchet MS', sans-serif"

function OuWealthLockup({ invert }: { invert: boolean }) {
  const uid = useId().replace(/:/g, '')
  const oGrad = `${uid}-o`
  const uGrad = `${uid}-u`
  const glow = `${uid}-glow`
  const wealth = invert ? '#9AD0FF' : '#1A5FA8'
  const community = invert ? '#F4F4F4' : '#1A1A1A'

  return (
    <>
      <defs>
        <linearGradient id={oGrad} x1="18" y1="16" x2="94" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFB14A" />
          <stop offset="0.42" stopColor="#FF8A1A" />
          <stop offset="1" stopColor="#F05A00" />
        </linearGradient>
        <linearGradient id={uGrad} x1="24" y1="10" x2="70" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={invert ? '#FFFFFF' : '#2A2A2A'} />
          <stop offset="0.55" stopColor={invert ? '#E4E4E4' : '#5C5C5C'} />
          <stop offset="1" stopColor={invert ? '#C8C8C8' : '#9A9A9A'} />
        </linearGradient>
        <filter id={glow} x="-28%" y="-28%" width="156%" height="156%">
          <feDropShadow
            dx="0"
            dy="1.2"
            stdDeviation="1.7"
            floodColor="#FF7A00"
            floodOpacity={invert ? 0.42 : 0.22}
          />
        </filter>
      </defs>
      <g aria-hidden="true">
        <path
          d={ORANGE_ARC}
          fill="none"
          stroke={`url(#${oGrad})`}
          strokeWidth="11"
          strokeLinecap="round"
          filter={`url(#${glow})`}
        />
        {U_PATHS.map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke={`url(#${uGrad})`}
            strokeWidth="1.85"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        <text
          x="108"
          y="57"
          fill={wealth}
          fontFamily={FONT}
          fontSize="40"
          fontWeight="700"
          letterSpacing="-0.5"
        >
          Wealth
        </text>
        <text
          x="110"
          y="82"
          fill={community}
          fontFamily={FONT}
          fontSize="11.5"
          fontWeight="700"
          textLength="132"
          lengthAdjust="spacing"
        >
          COMMUNITY
        </text>
      </g>
    </>
  )
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
        maxWidth: isFull ? { xs: 'min(100%, 340px)', sm: 400 } : { xs: 188, sm: 220 },
        ...sx,
      }}
    >
      <Box
        component="svg"
        role="img"
        aria-label={label}
        viewBox="0 0 268 112"
        preserveAspectRatio="xMinYMid meet"
        sx={{
          display: 'block',
          width: 'auto',
          height: isFull ? { xs: 58, sm: 76 } : size,
          maxWidth: '100%',
          overflow: 'visible',
        }}
      >
        <OuWealthLockup invert={invert} />
      </Box>
    </Box>
  )
}
