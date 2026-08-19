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
          ? 'radial-gradient(ellipse at 15% 0%, rgba(21,101,192,0.32) 0%, transparent 52%), radial-gradient(ellipse at 95% 85%, rgba(255,122,0,0.1) 0%, transparent 42%), linear-gradient(160deg, #0A0A0A 0%, #121212 100%)'
          : 'radial-gradient(ellipse at 15% 0%, rgba(21,101,192,0.16) 0%, transparent 52%), radial-gradient(ellipse at 95% 85%, rgba(255,122,0,0.08) 0%, transparent 42%), linear-gradient(160deg, #FFFFFF 0%, #F4F8FD 60%, #E8F1FB 100%)',
      }}
    >
      <Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 } }}>
        <Outlet />
      </Container>
    </Box>
  )
}
