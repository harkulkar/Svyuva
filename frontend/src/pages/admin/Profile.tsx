import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { ButtonSpinner } from '../../components/common/Loading';
import { TextField } from '../../components/auth/FormField';
import { useAuth } from '../../context/AuthContext';
import { changePasswordRequest, fetchOperationalSettings, getApiErrorMessage, updateAdminProfileRequest, updateOperationalSettings } from '../../services/api';
import { NotificationPreferencesCard } from '../../components/common/NotificationPreferencesCard';
import { Link } from 'react-router-dom';

const profileSchema = z.object({
  name: z.string().min(2, 'Name is required.'),
  phone: z.string().optional()
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Confirm the new password.')
  })
  .refine((value) => value.newPassword === value.confirmPassword, { message: 'Passwords do not match.', path: ['confirmPassword'] });

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

export function AdminProfilePage() {
  const { user, refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const profileForm = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), values: { name: user?.name || '', phone: user?.phone || '' } });
  const passwordForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  async function onProfile(values: ProfileValues) {
    setError(null);
    setSuccess(null);
    try {
      await updateAdminProfileRequest(values);
      await refreshUser();
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
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <>
      <Seo title="Admin profile" path="/admin/profile" />
      <h1 className="text-2xl font-semibold text-navy">Profile</h1>
      {error ? <div className="mt-4"><ErrorMessage message={error} /></div> : null}
      {success ? <p className="mt-4 text-sm text-green-800" role="status">{success}</p> : null}
      <dl className="mt-6 grid gap-2 border border-slate-300 bg-white p-5 text-sm sm:grid-cols-2">
        <div><dt className="text-slate-500">Email</dt><dd className="font-medium text-navy">{user?.email}</dd></div>
        <div><dt className="text-slate-500">Role</dt><dd className="font-medium text-navy">{user?.role}</dd></div>
        <div><dt className="text-slate-500">Status</dt><dd className="font-medium text-navy">{user?.status}</dd></div>
        <div><dt className="text-slate-500">Last login</dt><dd className="font-medium text-navy">{user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—'}</dd></div>
      </dl>
      <form className="mt-6 max-w-lg space-y-4 border border-slate-300 bg-white p-5" onSubmit={profileForm.handleSubmit(onProfile)} noValidate>
        <h2 className="text-sm font-semibold text-navy">Safe profile changes</h2>
        <TextField label="Name" required error={profileForm.formState.errors.name?.message} {...profileForm.register('name')} />
        <TextField label="Mobile" type="tel" error={profileForm.formState.errors.phone?.message} {...profileForm.register('phone')} />
        <button type="submit" className="inline-flex items-center gap-2 bg-navy px-4 py-2 text-sm font-semibold text-white" disabled={profileForm.formState.isSubmitting}>
          {profileForm.formState.isSubmitting ? <ButtonSpinner /> : null}
          Save profile
        </button>
      </form>
      <NotificationPreferencesCard notificationsPath="/admin/notifications" />
      <form className="mt-6 max-w-lg space-y-4 border border-slate-300 bg-white p-5" onSubmit={passwordForm.handleSubmit(onPassword)} noValidate>
        <h2 className="text-sm font-semibold text-navy">Change password</h2>
        <TextField type="password" label="Current password" required error={passwordForm.formState.errors.currentPassword?.message} {...passwordForm.register('currentPassword')} />
        <TextField type="password" label="New password" required error={passwordForm.formState.errors.newPassword?.message} {...passwordForm.register('newPassword')} />
        <TextField type="password" label="Confirm password" required error={passwordForm.formState.errors.confirmPassword?.message} {...passwordForm.register('confirmPassword')} />
        <button type="submit" className="inline-flex items-center gap-2 bg-navy px-4 py-2 text-sm font-semibold text-white" disabled={passwordForm.formState.isSubmitting}>
          {passwordForm.formState.isSubmitting ? <ButtonSpinner /> : null}
          Update password
        </button>
      </form>
    </>
  );
}

export function AdminSettingsPage() {
  return (
    <>
      <Seo title="Settings" path="/admin/settings" />
      <h1 className="text-2xl font-semibold text-navy">Settings</h1>
      <p className="mt-2 text-sm text-slate-700">Account settings for this administrator. Scheme configuration belongs to a later phase.</p>
      <ul className="mt-6 space-y-2 text-sm">
        <li><Link className="font-semibold text-navy underline" to="/admin/profile">Profile and password</Link></li>
        <li><Link className="font-semibold text-navy underline" to="/admin/users">User accounts (disable / re-enable)</Link></li>
        <li><Link className="font-semibold text-navy underline" to="/admin/notification-templates">Notification templates</Link></li>
        <li><Link className="font-semibold text-navy underline" to="/admin/announcements">Announcements</Link></li>
        <li><Link className="font-semibold text-navy underline" to="/admin/system-jobs">System jobs</Link></li>
        <li><Link className="font-semibold text-navy underline" to="/admin/system-health">System health</Link></li>
        <li><Link className="font-semibold text-navy underline" to="/admin/support">Support and data correction</Link></li>
      </ul>
      <OperationalSettingsForm />
    </>
  );
}

function OperationalSettingsForm() {
  const [items, setItems] = useState<Array<{ key: string; value: unknown; note?: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    void fetchOperationalSettings().then((data) => setItems(data.items)).catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  return (
    <section className="mt-8 max-w-lg border border-slate-300 bg-white p-5">
      <h2 className="text-sm font-semibold text-navy">Operational settings</h2>
      <p className="mt-1 text-xs text-slate-500">Reminder intervals are not official scheme deadlines. Secrets stay in environment variables.</p>
      {error ? <p className="mt-2 text-sm text-red-800">{error}</p> : null}
      {saved ? <p className="mt-2 text-sm text-green-800">{saved}</p> : null}
      <form
        className="mt-4 space-y-3 text-sm"
        onSubmit={(event) => {
          event.preventDefault();
          const payload: Record<string, unknown> = {};
          for (const item of items) payload[item.key] = item.value;
          void updateOperationalSettings(payload)
            .then(() => setSaved('Settings saved.'))
            .catch((err) => setError(getApiErrorMessage(err)));
        }}
      >
        {items.map((item, index) => (
          <label key={item.key} className="block">
            {item.key}
            {typeof item.value === 'boolean' ? (
              <input
                type="checkbox"
                className="ml-2"
                checked={item.value}
                onChange={(event) => {
                  const next = [...items];
                  next[index] = { ...item, value: event.target.checked };
                  setItems(next);
                }}
              />
            ) : (
              <input
                type="number"
                className="mt-1 w-full border px-2 py-1"
                value={Number(item.value)}
                onChange={(event) => {
                  const next = [...items];
                  next[index] = { ...item, value: Number(event.target.value) };
                  setItems(next);
                }}
              />
            )}
            {item.note ? <span className="mt-1 block text-xs text-slate-500">{item.note}</span> : null}
          </label>
        ))}
        <button type="submit" className="bg-navy px-3 py-2 text-white">Save operational settings</button>
      </form>
    </section>
  );
}
