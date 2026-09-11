import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { Loading, ButtonSpinner } from '../../components/common/Loading';
import { TextAreaField, TextField } from '../../components/auth/FormField';
import { fetchCollegeProfile, getApiErrorMessage, updateCollegeProfile, changePasswordRequest, fetchEntityWorkflow, fetchWorkflowHistory, postWorkflowAction } from '../../services/api';
import { WorkflowTimeline } from '../../components/common/WorkflowTimeline';
import { ConfirmDialog } from '../../components/common/AdminUi';
import { useAuth } from '../../context/AuthContext';
import { NotificationPreferencesCard } from '../../components/common/NotificationPreferencesCard';
import type { InstituteProfile } from '../../types/auth';

const schema = z.object({
  address: z.string().min(5, 'Address is required.'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number.'),
  contactNumber1: z.string().optional(),
  contactNumber2: z.string().optional(),
  principalName: z.string().min(2, 'Principal name is required.')
});

type FormValues = z.infer<typeof schema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Confirm the new password.')
  })
  .refine((value) => value.newPassword === value.confirmPassword, { message: 'Passwords do not match.', path: ['confirmPassword'] });

type PasswordValues = z.infer<typeof passwordSchema>;

export function CollegeProfilePage() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState<InstituteProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [canResubmit, setCanResubmit] = useState(false);
  const [history, setHistory] = useState<Array<{ id: string; fromState: string; toState: string; action: string; performedBy: string | null; performedRole: string; reason: string | null; comments: string | null; timestamp: string }>>([]);
  const [resubmitOpen, setResubmitOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema) });
  const passwordForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  useEffect(() => {
    void fetchCollegeProfile()
      .then((item) => {
        setProfile(item);
        reset({
          address: item.address,
          mobile: item.mobile,
          contactNumber1: item.contactNumber1,
          contactNumber2: item.contactNumber2,
          principalName: item.principalName
        });
        if (item.id) {
          void fetchEntityWorkflow('COLLEGE', 'INSTITUTE_REGISTRATION', item.id)
            .then(async (row) => {
              setWorkflowId(row.id);
              setCanResubmit((row.allowedActions || []).includes('RESUBMIT'));
              setHistory(await fetchWorkflowHistory('COLLEGE', row.id));
            })
            .catch(() => undefined);
        }
      })
      .catch((err) => setError(getApiErrorMessage(err)));
  }, [reset]);

  async function onSubmit(values: FormValues) {
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateCollegeProfile({
        address: values.address,
        mobile: values.mobile,
        contactNumber1: values.contactNumber1 ?? '',
        contactNumber2: values.contactNumber2 ?? '',
        principalName: values.principalName
      });
      setProfile(updated);
      setSuccess('Profile updated.');
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function onPassword(values: PasswordValues) {
    setError(null);
    setSuccess(null);
    try {
      setSuccess(await changePasswordRequest(values.currentPassword, values.newPassword, values.confirmPassword));
      passwordForm.reset();
      await refreshUser();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <>
      <Seo title="College profile" path="/college/profile" />
      <h1 className="text-2xl font-semibold text-navy">My profile</h1>
      {error ? <div className="mt-4"><ErrorMessage message={error} /></div> : null}
      {success ? <p className="mt-4 text-sm text-green-800" role="status">{success}</p> : null}
      {!profile && !error ? <div className="mt-4"><Loading /></div> : null}
      {profile ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <dl className="space-y-2 border border-slate-300 bg-white p-5 text-sm">
            <Item label="University" value={profile.university.name} />
            <Item label="Institute name" value={profile.name} />
            <Item label="Institute code" value={profile.code || '—'} />
            <Item label="Email" value={profile.email} />
            <Item label="District" value={profile.district} />
            <Item label="Taluka" value={profile.taluka} />
            <Item label="JD Region" value={profile.jdRegion} />
            <Item label="College type" value={profile.collegeType} />
            <Item label="Status" value={profile.status} />
            {profile.correctionReason ? <Item label="Correction needed" value={profile.correctionReason} /> : null}
            {profile.rejectionReason ? <Item label="Rejection reason" value={profile.rejectionReason} /> : null}
          </dl>
          <form className="space-y-4 border border-slate-300 bg-white p-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField label="Principal name" required error={errors.principalName?.message} {...register('principalName')} />
            <TextField label="Mobile" required type="tel" error={errors.mobile?.message} {...register('mobile')} />
            <TextField label="Contact number 1" error={errors.contactNumber1?.message} {...register('contactNumber1')} />
            <TextField label="Contact number 2" error={errors.contactNumber2?.message} {...register('contactNumber2')} />
            <TextAreaField label="Address" required rows={3} error={errors.address?.message} {...register('address')} />
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isSubmitting ? <ButtonSpinner /> : null}
              Save
            </button>
            {canResubmit && workflowId ? (
              <button type="button" className="ml-2 min-h-11 border border-navy px-4 py-2 text-sm font-semibold text-navy" onClick={() => setResubmitOpen(true)}>
                Resubmit registration
              </button>
            ) : null}
          </form>
        </div>
      ) : null}
      {history.length ? (
        <section className="mt-6 border border-slate-300 bg-white p-5">
          <h2 className="text-sm font-semibold text-navy">Registration timeline</h2>
          <div className="mt-3"><WorkflowTimeline items={history} /></div>
        </section>
      ) : null}
      <ConfirmDialog
        open={resubmitOpen}
        title="Resubmit registration"
        confirmLabel="Resubmit"
        onCancel={() => setResubmitOpen(false)}
        onConfirm={() => {
          if (!workflowId) return;
          void postWorkflowAction('COLLEGE', workflowId, { action: 'RESUBMIT' })
            .then(async (row) => {
              setHistory(await fetchWorkflowHistory('COLLEGE', row.id));
              setSuccess('Registration resubmitted for review.');
              setResubmitOpen(false);
            })
            .catch((err) => setError(getApiErrorMessage(err)));
        }}
      >
        Confirm that you have updated the requested fields and documents.
      </ConfirmDialog>
      <NotificationPreferencesCard notificationsPath="/college/notifications" />
      {user ? (
        <form className="mt-6 max-w-lg space-y-4 border border-slate-300 bg-white p-5" onSubmit={passwordForm.handleSubmit(onPassword)} noValidate>
          <h2 className="text-sm font-semibold text-navy">{user.passwordResetRequired ? 'Password reset required' : 'Change password'}</h2>
          <TextField type="password" label="Current password" required error={passwordForm.formState.errors.currentPassword?.message} {...passwordForm.register('currentPassword')} />
          <TextField type="password" label="New password" required error={passwordForm.formState.errors.newPassword?.message} {...passwordForm.register('newPassword')} />
          <TextField type="password" label="Confirm password" required error={passwordForm.formState.errors.confirmPassword?.message} {...passwordForm.register('confirmPassword')} />
          <button type="submit" className="inline-flex items-center gap-2 bg-navy px-4 py-2 text-sm font-semibold text-white" disabled={passwordForm.formState.isSubmitting}>
            {passwordForm.formState.isSubmitting ? <ButtonSpinner /> : null}
            Update password
          </button>
        </form>
      ) : null}
    </>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-slate-500">{label}</dt>
      <dd className="font-medium text-navy">{value}</dd>
    </div>
  );
}
