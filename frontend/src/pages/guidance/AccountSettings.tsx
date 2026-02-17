import { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchCurrentUser, updateProfile, updateUser, uploadAvatar } from '../../services/api';

export default function GuidanceAccountSettings() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    current_password: '',
    new_password: '',
    avatarFile: null as File | null,
  });

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);
      setError('');
      try {
        const me = await fetchCurrentUser(user.id);
        setForm((prev) => ({
          ...prev,
          first_name: me.first_name || '',
          last_name: me.last_name || '',
          email: me.email || user.email || '',
        }));
      } catch {
        setError('Failed to load your account details.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id, user?.email]);

  const save = async () => {
    if (!user?.id) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      let updatedUser = await updateProfile(user.id, {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
      });

      if (form.new_password) {
        await updateUser(user.id, { password: form.new_password });
      }

      if (form.avatarFile) {
        updatedUser = await uploadAvatar(user.id, form.avatarFile);
      }

      refreshUser(updatedUser);
      setForm((prev) => ({ ...prev, current_password: '', new_password: '', avatarFile: null }));
      setMessage('Account settings updated.');
    } catch {
      setError('Failed to update account settings.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-8 min-h-[calc(100vh-120px)] flex items-start justify-center">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6 max-w-4xl w-full">
        <div className="flex items-start justify-between gap-4">
          <div className="text-center mx-auto">
            <h2 className="text-lg font-semibold text-gray-900">Guidance Account Settings</h2>
            <p className="text-sm text-gray-500 mt-1">Edit profile details, avatar, and password. No system settings access.</p>
          </div>
          <div className="shrink-0 self-start">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm cursor-pointer hover:bg-gray-50">
              <Camera className="w-4 h-4" />
              Change Avatar
              <input className="hidden" type="file" accept="image/*" onChange={(e) => setForm((p) => ({ ...p, avatarFile: e.target.files?.[0] || null }))} />
            </label>
          </div>
        </div>

        {error ? <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div> : null}
        {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2 text-sm">{message}</div> : null}

        {loading ? (
          <div className="text-sm text-gray-500">Loading account settings...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-800">Profile Information</h3>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-xs text-gray-600">First Name</label>
                    <input className="mt-1 w-full border rounded-lg px-3 py-2" value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Last Name</label>
                    <input className="mt-1 w-full border rounded-lg px-3 py-2" value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Email</label>
                    <input className="mt-1 w-full border rounded-lg px-3 py-2" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-800">Security</h3>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-xs text-gray-600">Current Password</label>
                    <input className="mt-1 w-full border rounded-lg px-3 py-2" type="password" placeholder="Current password (optional)" value={form.current_password} onChange={(e) => setForm((p) => ({ ...p, current_password: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">New Password</label>
                    <input className="mt-1 w-full border rounded-lg px-3 py-2" type="password" placeholder="New password (optional)" value={form.new_password} onChange={(e) => setForm((p) => ({ ...p, new_password: e.target.value }))} />
                  </div>
                  <p className="text-xs text-gray-500">If password fields are blank, password remains unchanged.</p>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <button disabled={busy} onClick={save} className="bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-60 hover:bg-emerald-700">
                {busy ? 'Saving...' : 'Save Account'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
