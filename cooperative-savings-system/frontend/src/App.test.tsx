import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('@/shared/api/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api/auth')>()
  return {
    ...actual,
    refresh: vi.fn().mockRejectedValue(new Error('no session')),
  }
})

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the TERIMBERE brand on the login route', async () => {
    render(<App />)
    expect(await screen.findByText('TERIMBERE')).toBeInTheDocument()
  })
})
