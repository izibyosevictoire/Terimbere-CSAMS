import { yupResolver } from '@hookform/resolvers/yup'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { Member } from '@/shared/types/member'
import { ROLES_IN_COOPERATIVE } from '@/shared/types/member'
import {
  memberCreateSchema,
  memberFormDefaults,
  toMemberCreatePayload,
  toMemberUpdatePayload,
  type MemberFormValues,
  type MemberUpdateFormValues,
} from './memberFormSchema'

interface MemberFormDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: Member | null
  loading?: boolean
  onClose: () => void
  onCreate?: (payload: ReturnType<typeof toMemberCreatePayload>) => void
  onUpdate?: (payload: ReturnType<typeof toMemberUpdatePayload>) => void
}

function fromMember(member: Member): MemberFormValues {
  return {
    firstName: member.firstName ?? '',
    lastName: member.lastName ?? '',
    username: member.username ?? '',
    email: member.email ?? '',
    phone: member.phone ?? '',
    nationalId: member.nationalId ?? '',
    address: member.address ?? '',
    membershipDate: member.membershipDate ?? '',
    temporaryPassword: '',
    roleInCooperative:
      member.roleInCooperative === 'COOPERATIVE_ADMIN' ? 'COOPERATIVE_ADMIN' : 'MEMBER',
  }
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$'
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

export function MemberFormDialog({
  open,
  mode,
  initial,
  loading = false,
  onClose,
  onCreate,
  onUpdate,
}: MemberFormDialogProps) {
  const { t } = useTranslation()
  const isCreate = mode === 'create'

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<MemberFormValues>({
    resolver: yupResolver(memberCreateSchema),
    defaultValues: memberFormDefaults,
  })

  useEffect(() => {
    if (!open) return
    reset(initial ? fromMember(initial) : memberFormDefaults)
  }, [open, initial, reset])

  const onSubmit = handleSubmit((values) => {
    if (isCreate) {
      onCreate?.(toMemberCreatePayload(values))
      return
    }
    const updateValues: MemberUpdateFormValues = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone,
      nationalId: values.nationalId,
      address: values.address,
      membershipDate: values.membershipDate,
      roleInCooperative: values.roleInCooperative,
    }
    onUpdate?.(toMemberUpdatePayload(updateValues))
  })

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {isCreate ? t('members.registerTitle') : t('members.editTitle')}
      </DialogTitle>
      <form onSubmit={onSubmit} noValidate>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t('members.fields.firstName')}
                required
                fullWidth
                error={Boolean(errors.firstName)}
                helperText={errors.firstName?.message}
                {...register('firstName')}
              />
              <TextField
                label={t('members.fields.lastName')}
                required
                fullWidth
                error={Boolean(errors.lastName)}
                helperText={errors.lastName?.message}
                {...register('lastName')}
              />
            </Stack>
            {isCreate ? (
              <TextField
                label={t('members.fields.username')}
                required
                fullWidth
                error={Boolean(errors.username)}
                helperText={errors.username?.message}
                {...register('username')}
              />
            ) : (
              <TextField
                label={t('members.fields.username')}
                fullWidth
                value={initial?.username ?? ''}
                disabled
              />
            )}
            <TextField
              label={t('members.fields.email')}
              required
              fullWidth
              error={Boolean(errors.email)}
              helperText={errors.email?.message}
              {...register('email')}
            />
            <TextField label={t('members.fields.phone')} fullWidth {...register('phone')} />
            <Controller
              name="roleInCooperative"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label={t('members.fields.roleInCooperative')}
                  fullWidth
                >
                  {ROLES_IN_COOPERATIVE.map((role) => (
                    <MenuItem key={role} value={role}>
                      {t(`members.roles.${role}`)}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            {isCreate ? (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'flex-start' } }}>
                <TextField
                  label={t('members.fields.temporaryPassword')}
                  type="text"
                  fullWidth
                  autoComplete="new-password"
                  error={Boolean(errors.temporaryPassword)}
                  helperText={
                    errors.temporaryPassword?.message || t('members.temporaryPasswordHint')
                  }
                  {...register('temporaryPassword')}
                />
                <Button
                  variant="outlined"
                  sx={{ minWidth: { sm: 160 }, whiteSpace: 'nowrap', mt: { sm: 0.5 } }}
                  onClick={() =>
                    setValue('temporaryPassword', generateTempPassword(), {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  {t('members.generatePassword')}
                </Button>
              </Stack>
            ) : null}

            <Accordion
              disableGutters
              elevation={0}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, '&:before': { display: 'none' } }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {t('members.additionalInfo')}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <TextField
                    label={t('members.fields.nationalId')}
                    fullWidth
                    slotProps={{
                      htmlInput: { maxLength: 16, inputMode: 'numeric', pattern: '[0-9]*' },
                    }}
                    error={Boolean(errors.nationalId)}
                    helperText={errors.nationalId?.message || 'Exactly 16 digits'}
                    {...register('nationalId')}
                  />
                  <TextField
                    label={t('members.fields.membershipDate')}
                    type="date"
                    fullWidth
                    slotProps={{
                      inputLabel: { shrink: true },
                      htmlInput: {
                        max: new Date().toISOString().slice(0, 10),
                        min: '1950-01-01',
                      },
                    }}
                    error={Boolean(errors.membershipDate)}
                    helperText={errors.membershipDate?.message}
                    {...register('membershipDate')}
                  />
                  <TextField
                    label={t('members.fields.address')}
                    fullWidth
                    multiline
                    minRows={2}
                    {...register('address')}
                  />
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
