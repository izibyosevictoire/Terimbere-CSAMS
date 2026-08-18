import { Box, Container } from '@mui/material'
import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        background:
          'radial-gradient(ellipse at 20% 0%, rgba(15,92,92,0.14) 0%, transparent 50%), radial-gradient(ellipse at 90% 80%, rgba(196,165,116,0.22) 0%, transparent 45%), linear-gradient(160deg, #F7F3EA 0%, #EFE8D8 55%, #E5EDE9 100%)',
      }}
    >
      <Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 } }}>
        <Outlet />
      </Container>
    </Box>
  )
}
