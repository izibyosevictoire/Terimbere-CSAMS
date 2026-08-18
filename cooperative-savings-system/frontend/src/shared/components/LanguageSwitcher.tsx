import { Button, ButtonGroup } from '@mui/material'
import { useTranslation } from 'react-i18next'

export function LanguageSwitcher({ size = 'small' }: { size?: 'small' | 'medium' }) {
  const { i18n, t } = useTranslation()
  const current = (i18n.language || 'en').startsWith('rw') ? 'rw' : 'en'

  return (
    <ButtonGroup size={size} variant="outlined" aria-label={t('common.language')}>
      <Button
        variant={current === 'en' ? 'contained' : 'outlined'}
        onClick={() => void i18n.changeLanguage('en')}
      >
        EN
      </Button>
      <Button
        variant={current === 'rw' ? 'contained' : 'outlined'}
        onClick={() => void i18n.changeLanguage('rw')}
      >
        RW
      </Button>
    </ButtonGroup>
  )
}
