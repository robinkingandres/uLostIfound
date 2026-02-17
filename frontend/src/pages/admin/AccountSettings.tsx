import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Camera } from 'lucide-react';
import {
  createSettingsCategory,
  deleteSettingsCategory,
  fetchCurrentUser,
  fetchSettingsCategories,
  fetchSiteSettings,
  updateProfile,
  updateSettingsCategory,
  updateSiteSettings,
  uploadAvatar,
  updateUser,
  type SettingsCategory,
  type SiteSettings,
} from '../../services/api';

type Tab = 'account' | 'system';

const buildDefaultSettings = (): SiteSettings => ({
  id: 0,
  org_name: 'San Isidro National High School',
  org_tagline: 'Verified Lost & Found',
  org_logo: null,
  org_logo_url: null,
  default_new_report_status: 'Pending',
  home_visible_report_statuses: ['Verified'],
  claim_require_proof_image: false,
  ai_min_score: 50,
  ai_matching_enabled: true,
  user_home_chatbot_visible: true,
  user_home_chat_notification_dot: true,
  email_master_enabled: true,
  email_notify_verified_reports: true,
  email_notify_claim_results: true,
  categories: [],
  updated_at: '',
});

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState<Tab>('account');
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [account, setAccount] = useState({
    first_name: '',
    last_name: '',
    email: '',
    current_password: '',
    new_password: '',
    avatarFile: null as File | null,
  });

  const [settings, setSettings] = useState<SiteSettings | null>(buildDefaultSettings());
  const [newCategory, setNewCategory] = useState('');

  const categories = useMemo(() => settings?.categories || [], [settings]);

  const refreshCategories = async () => {
    try {
      const cats = await fetchSettingsCategories();
      setSettings((prev) => prev ? { ...prev, categories: cats.sort((a, b) => a.sort_order - b.sort_order) } : prev);
    } catch {
      // ignore, keep last known categories
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      setLoadingInitial(true);
      try {
        const [meResult, siteResult] = await Promise.allSettled([
          fetchCurrentUser(user.id),
          fetchSiteSettings(),
        ]);

        if (meResult.status === 'fulfilled') {
          const me = meResult.value;
          setAccount((prev) => ({
            ...prev,
            first_name: me.first_name || '',
            last_name: me.last_name || '',
            email: me.email || user.email || '',
          }));
        } else {
          const [first_name, ...rest] = (user.name || '').split(' ');
          setAccount((prev) => ({
            ...prev,
            first_name: first_name || '',
            last_name: rest.join(' '),
            email: user.email || '',
          }));
        }

        if (siteResult.status === 'fulfilled') {
          const site = siteResult.value;
          setSettings(site);
          if (!site.categories || site.categories.length === 0) {
            await refreshCategories();
          }
        } else {
          // Keep page functional even if system settings API/model isn't available yet.
          setSettings(buildDefaultSettings());
          setError('System settings endpoint is unavailable. Showing fallback defaults.');
          await refreshCategories();
        }
      } catch {
        setError('Failed to load settings data.');
      } finally {
        setLoadingInitial(false);
      }
    };
    load();
  }, [user?.id, user?.email, user?.name]);

  const saveAccount = async () => {
    if (!user?.id) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      let updatedUser = await updateProfile(user.id, {
        first_name: account.first_name,
        last_name: account.last_name,
        email: account.email,
      });

      if (account.new_password) {
        await updateUser(user.id, { password: account.new_password });
      }

      if (account.avatarFile) {
        updatedUser = await uploadAvatar(user.id, account.avatarFile);
      }

      refreshUser(updatedUser);
      setAccount((prev) => ({ ...prev, current_password: '', new_password: '', avatarFile: null }));
      setMessage('Account settings updated.');
    } catch {
      setError('Failed to update account settings.');
    } finally {
      setBusy(false);
    }
  };

  const patchSettings = async (payload: Partial<SiteSettings>) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const updated = await updateSiteSettings(payload);
      setSettings(updated);
      setMessage('System settings updated.');
    } catch {
      setError('Failed to update system settings.');
    } finally {
      setBusy(false);
    }
  };

  const uploadLogo = async (file: File) => {
    const form = new FormData();
    form.append('org_logo', file);
    await patchSettings(form as unknown as Partial<SiteSettings>);
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    setBusy(true);
    setError('');
    try {
      const maxOrder = categories.reduce((m, c) => Math.max(m, c.sort_order), -1);
      const created = await createSettingsCategory({
        name: newCategory.trim(),
        sort_order: maxOrder + 1,
        is_active: true,
      });
      setSettings((prev) => prev ? { ...prev, categories: [...prev.categories, created].sort((a, b) => a.sort_order - b.sort_order) } : prev);
      setNewCategory('');
      await refreshCategories();
    } catch {
      setError('Failed to create category.');
    } finally {
      setBusy(false);
    }
  };

  const moveCategory = async (cat: SettingsCategory, delta: number) => {
    const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((c) => c.id === cat.id);
    const swapIdx = idx + delta;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;
    const target = sorted[swapIdx];
    setBusy(true);
    try {
      await Promise.all([
        updateSettingsCategory(cat.id, { sort_order: target.sort_order }),
        updateSettingsCategory(target.id, { sort_order: cat.sort_order }),
      ]);
      await refreshCategories();
    } catch {
      setError('Failed to reorder category.');
    } finally {
      setBusy(false);
    }
  };

  const removeCategory = async (id: number) => {
    setBusy(true);
    try {
      await deleteSettingsCategory(id);
      await refreshCategories();
    } catch {
      setError('Failed to remove category.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-8 space-y-4">
      <div className="flex gap-2">
        <button className={`px-4 py-2 rounded-lg text-sm ${tab === 'account' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-300'}`} onClick={() => setTab('account')}>Account</button>
        <button className={`px-4 py-2 rounded-lg text-sm ${tab === 'system' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-300'}`} onClick={() => setTab('system')}>System</button>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div> : null}
      {message ? <div className="rounded-lg border border-green-200 bg-green-50 text-green-700 px-3 py-2 text-sm">{message}</div> : null}

      {loadingInitial ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 text-sm text-gray-500">Loading settings...</div>
      ) : tab === 'account' ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6 max-w-4xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Account Settings</h2>
              <p className="text-sm text-gray-500 mt-1">Manage admin profile, login email, avatar, and password.</p>
            </div>
            <div className="shrink-0">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm cursor-pointer hover:bg-gray-50">
                <Camera className="w-4 h-4" />
                Change Avatar
                <input className="hidden" type="file" accept="image/*" onChange={(e) => setAccount((p) => ({ ...p, avatarFile: e.target.files?.[0] || null }))} />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-gray-200 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">Profile Information</h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-xs text-gray-600">First Name</label>
                  <input className="mt-1 w-full border rounded-lg px-3 py-2" placeholder="First name" value={account.first_name} onChange={(e) => setAccount((p) => ({ ...p, first_name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Last Name</label>
                  <input className="mt-1 w-full border rounded-lg px-3 py-2" placeholder="Last name" value={account.last_name} onChange={(e) => setAccount((p) => ({ ...p, last_name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Email</label>
                  <input className="mt-1 w-full border rounded-lg px-3 py-2" placeholder="Email" value={account.email} onChange={(e) => setAccount((p) => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">Security</h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-xs text-gray-600">Current Password</label>
                  <input className="mt-1 w-full border rounded-lg px-3 py-2" type="password" placeholder="Current password (optional)" value={account.current_password} onChange={(e) => setAccount((p) => ({ ...p, current_password: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-600">New Password</label>
                  <input className="mt-1 w-full border rounded-lg px-3 py-2" type="password" placeholder="New password (optional)" value={account.new_password} onChange={(e) => setAccount((p) => ({ ...p, new_password: e.target.value }))} />
                </div>
                <p className="text-xs text-gray-500">If password fields are blank, password remains unchanged.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button disabled={busy} onClick={saveAccount} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-60">
              {busy ? 'Saving...' : 'Save Account'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">System Settings</h2>
            <p className="text-sm text-gray-500 mt-1">Manage branding, categories, report behavior, AI and notification controls.</p>
          </div>
          {!settings ? <p className="text-sm text-gray-500">Loading settings...</p> : (
            <>
              <section className="space-y-2 rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-sm text-gray-800">Branding</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input className="border rounded-lg px-3 py-2" value={settings.org_name} onChange={(e) => setSettings((p) => p ? { ...p, org_name: e.target.value } : p)} placeholder="Organization name" />
                  <input className="border rounded-lg px-3 py-2 md:col-span-2" value={settings.org_tagline} onChange={(e) => setSettings((p) => p ? { ...p, org_tagline: e.target.value } : p)} placeholder="Tagline" />
                  <input className="border rounded-lg px-3 py-2 md:col-span-3" type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
                </div>
              </section>

              <section className="space-y-3 rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-sm text-gray-800">Categories</h3>
                <div className="flex gap-2">
                  <input className="border rounded-lg px-3 py-2 flex-1" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Add category" />
                  <button onClick={addCategory} disabled={busy} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">Add</button>
                </div>
                <div className="space-y-2">
                  {categories.length === 0 ? (
                    <div className="text-sm text-gray-500 border rounded-lg px-3 py-3 bg-gray-50">
                      No categories found yet. Add your first category above.
                    </div>
                  ) : categories.map((cat) => (
                    <div key={cat.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 border rounded-lg px-3 py-2">
                      <input className="border rounded px-2 py-1 text-sm w-full" value={cat.name} onChange={(e) => setSettings((p) => p ? { ...p, categories: p.categories.map((x) => x.id === cat.id ? { ...x, name: e.target.value } : x) } : p)} onBlur={async () => { await updateSettingsCategory(cat.id, { name: cat.name }); }} />
                      <button onClick={() => moveCategory(cat, -1)} className="text-xs border rounded px-2 py-1">Up</button>
                      <button onClick={() => moveCategory(cat, 1)} className="text-xs border rounded px-2 py-1">Down</button>
                      <button onClick={() => removeCategory(cat.id)} className="text-xs border rounded px-2 py-1 text-red-600 border-red-200">Remove</button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-gray-200 p-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-gray-800">Reports</h3>
                  <label className="text-xs text-gray-600">Default report status</label>
                  <select className="w-full border rounded-lg px-3 py-2" value={settings.default_new_report_status} onChange={(e) => setSettings((p) => p ? { ...p, default_new_report_status: e.target.value as SiteSettings['default_new_report_status'] } : p)}>
                    <option value="Pending">Pending</option>
                    <option value="Verified">Verified</option>
                  </select>
                  <label className="text-xs text-gray-600">Home visible statuses (comma-separated)</label>
                  <input className="w-full border rounded-lg px-3 py-2" value={settings.home_visible_report_statuses.join(', ')} onChange={(e) => setSettings((p) => p ? { ...p, home_visible_report_statuses: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) } : p)} />
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-gray-800">Claims & AI</h3>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.claim_require_proof_image} onChange={(e) => setSettings((p) => p ? { ...p, claim_require_proof_image: e.target.checked } : p)} /> Require proof image for claims</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.ai_matching_enabled} onChange={(e) => setSettings((p) => p ? { ...p, ai_matching_enabled: e.target.checked } : p)} /> Enable AI matching</label>
                  <label className="text-xs text-gray-600">AI minimum score</label>
                  <input type="number" min={0} max={100} className="w-full border rounded-lg px-3 py-2" value={settings.ai_min_score} onChange={(e) => setSettings((p) => p ? { ...p, ai_min_score: Number(e.target.value) } : p)} />
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-gray-200 p-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-gray-800">User Home</h3>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.user_home_chatbot_visible} onChange={(e) => setSettings((p) => p ? { ...p, user_home_chatbot_visible: e.target.checked } : p)} /> Show chatbot</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.user_home_chat_notification_dot} onChange={(e) => setSettings((p) => p ? { ...p, user_home_chat_notification_dot: e.target.checked } : p)} /> Show chatbot notification dot</label>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-gray-800">Email</h3>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.email_master_enabled} onChange={(e) => setSettings((p) => p ? { ...p, email_master_enabled: e.target.checked } : p)} /> Enable outgoing email</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.email_notify_verified_reports} onChange={(e) => setSettings((p) => p ? { ...p, email_notify_verified_reports: e.target.checked } : p)} /> Notify on verified reports</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.email_notify_claim_results} onChange={(e) => setSettings((p) => p ? { ...p, email_notify_claim_results: e.target.checked } : p)} /> Notify on claim results</label>
                </div>
              </section>

              <button disabled={busy} onClick={() => patchSettings({
                org_name: settings.org_name,
                org_tagline: settings.org_tagline,
                default_new_report_status: settings.default_new_report_status,
                home_visible_report_statuses: settings.home_visible_report_statuses,
                claim_require_proof_image: settings.claim_require_proof_image,
                ai_min_score: settings.ai_min_score,
                ai_matching_enabled: settings.ai_matching_enabled,
                user_home_chatbot_visible: settings.user_home_chatbot_visible,
                user_home_chat_notification_dot: settings.user_home_chat_notification_dot,
                email_master_enabled: settings.email_master_enabled,
                email_notify_verified_reports: settings.email_notify_verified_reports,
                email_notify_claim_results: settings.email_notify_claim_results,
              })} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-60">
                Save System Settings
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
