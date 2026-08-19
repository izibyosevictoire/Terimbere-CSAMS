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
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
        <BrandLogo size={56} />
      </Box>
      <Typography
        component="p"
        sx={{
          fontFamily: 'var(--font-brand)',
          fontSize: { xs: '2.25rem', sm: '2.75rem' },
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: 'text.primary',
          lineHeight: 1,
          mb: tagline || subtitle ? 1 : 0,
        }}
      >
        {title}
      </Typography>
      {tagline ? (
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
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
