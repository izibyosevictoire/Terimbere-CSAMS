import { Box, Container, useTheme } from '@mui/material'
import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  const theme = useTheme()
  const dark = theme.palette.mode === 'dark'

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        background: dark
          ? 'radial-gradient(ellipse at 20% 0%, rgba(255,122,0,0.22) 0%, transparent 50%), radial-gradient(ellipse at 90% 80%, rgba(21,101,192,0.28) 0%, transparent 45%), linear-gradient(160deg, #0A0A0A 0%, #161616 55%, #1A120C 100%)'
          : 'radial-gradient(ellipse at 20% 0%, rgba(255,122,0,0.16) 0%, transparent 50%), radial-gradient(ellipse at 90% 80%, rgba(21,101,192,0.12) 0%, transparent 45%), linear-gradient(160deg, #FFFFFF 0%, #FFF7F0 55%, #FFE8D2 100%)',
      }}
    >
      <Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 } }}>
        <Outlet />
      </Container>
    </Box>
  )
}
