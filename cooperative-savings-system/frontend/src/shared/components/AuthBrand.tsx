import { Box, Typography } from '@mui/material'
import { BrandLogo } from '@/shared/components/BrandLogo'

interface AuthBrandProps {
  title: string
  tagline?: string
  subtitle?: string
}

export function AuthBrand({ title, tagline, subtitle }: AuthBrandProps) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5, px: 1 }}>
        <BrandLogo variant="full" animate />
      </Box>
      <Typography
        component="h1"
        sx={{
          fontFamily: 'var(--font-brand)',
          fontSize: { xs: '1.35rem', sm: '1.6rem' },
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: 'text.primary',
          lineHeight: 1.2,
          mb: tagline || subtitle ? 1 : 0,
        }}
      >
        {title}
      </Typography>
      {tagline ? (
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{ fontWeight: 500, fontSize: { xs: '0.95rem', sm: '1.1rem' }, px: 1 }}
        >
          {tagline}
        </Typography>
      ) : null}
      {subtitle ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: tagline ? 1.5 : 0 }}>
          {subtitle}
        </Typography>
      ) : null}
    </Box>
  )
}
