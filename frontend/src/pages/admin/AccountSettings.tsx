import { useEffect, useMemo, useState } from 'react';
import { Camera } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchCurrentUser,
  fetchSettingsCategories,
  fetchSiteSettings,
  patchSettingsCategories,
  updateAiThreshold,
  updateProfile,
  updateSiteSettings,
  updateUser,
  uploadAvatar,
  type SettingsCategory,
  type SiteSettings,
} from '../../services/api';
import { useAdminTheme } from '../../contexts/AdminThemeContext';

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
  ai_min_score: 75,
  ai_matching_enabled: true,
  user_home_chatbot_visible: true,
  user_home_chat_notification_dot: true,
  email_master_enabled: true,
  email_notify_verified_reports: true,
  email_notify_claim_results: true,
  categories: [],
  updated_at: '',
});

function sortCategories(cats: SettingsCategory[]) {
  return [...cats].sort((a, b) => a.sort_order - b.sort_order);
}

export default function SettingsPage() {
  const { isDark } = useAdminTheme();
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState<Tab>('account');
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [busy, setBusy] = useState(false);
  const [categoriesBusy, setCategoriesBusy] = useState(false);
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
  const [categories, setCategories] = useState<SettingsCategory[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [nextTempId, setNextTempId] = useState(-1);
  const [isDirty, setIsDirty] = useState(false);

  const aiThreshold = useMemo(() => Math.max(0, Math.min(100, Math.round(settings?.ai_min_score ?? 75))), [settings?.ai_min_score]);

  const refreshCategories = async () => {
    try {
      const cats = await fetchSettingsCategories();
      const sorted = sortCategories(cats);
      setCategories(sorted);
      setIsDirty(false);
    } catch {
      // keep local draft
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      setLoadingInitial(true);
      try {
        const [meResult, siteResult, catsResult] = await Promise.allSettled([
          fetchCurrentUser(user.id),
          fetchSiteSettings(),
          fetchSettingsCategories(),
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
          if (!site.ai_min_score && site.ai_min_score !== 0) {
            site.ai_min_score = 75;
          }
          setSettings(site);
          const sourceCategories = site.categories?.length ? site.categories : (catsResult.status === 'fulfilled' ? catsResult.value : []);
          setCategories(sortCategories(sourceCategories));
        } else {
          setSettings(buildDefaultSettings());
          setError('System settings endpoint is unavailable. Showing fallback defaults.');
          if (catsResult.status === 'fulfilled') {
            setCategories(sortCategories(catsResult.value));
          }
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

  const saveSystemSettings = async () => {
    if (!settings) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const updated = await updateSiteSettings({
        claim_require_proof_image: settings.claim_require_proof_image,
        ai_matching_enabled: settings.ai_matching_enabled,
        user_home_chatbot_visible: settings.user_home_chatbot_visible,
        user_home_chat_notification_dot: settings.user_home_chat_notification_dot,
        email_master_enabled: settings.email_master_enabled,
      });
      setSettings(updated);
      setMessage('System settings updated.');
    } catch {
      setError('Failed to update system settings.');
    } finally {
      setBusy(false);
    }
  };

  const saveThreshold = async (value: number) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const updated = await updateAiThreshold(value);
      setSettings(updated);
      setMessage('AI threshold updated.');
    } catch {
      setError('Failed to update AI threshold.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddCategory = () => {
    const name = newCategory.trim();
    if (!name) return;
    const next = [...categories, { id: nextTempId, name, sort_order: categories.length, is_active: true }];
    setCategories(sortCategories(next).map((c, idx) => ({ ...c, sort_order: idx })));
    setNewCategory('');
    setNextTempId((v) => v - 1);
    setIsDirty(true);
  };

  const handleMoveCategory = (id: number, delta: number) => {
    const sorted = sortCategories(categories);
    const index = sorted.findIndex((c) => c.id === id);
    const swapIndex = index + delta;
    if (index < 0 || swapIndex < 0 || swapIndex >= sorted.length) return;
    [sorted[index], sorted[swapIndex]] = [sorted[swapIndex], sorted[index]];
    setCategories(sorted.map((c, idx) => ({ ...c, sort_order: idx })));
    setIsDirty(true);
  };

  const handleRemoveCategory = (id: number) => {
    setCategories(categories.filter((c) => c.id !== id).map((c, idx) => ({ ...c, sort_order: idx })));
    setIsDirty(true);
  };

  const handleCategoryNameChange = (id: number, name: string) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
    setIsDirty(true);
  };

  const handleSaveCategories = async () => {
    setCategoriesBusy(true);
    setError('');
    setMessage('');
    try {
      const payload = categories
        .map((c, idx) => ({
          id: c.id > 0 ? c.id : c.id,
          name: c.name.trim(),
          sort_order: idx,
          is_active: true,
        }))
        .filter((c) => c.name.length > 0);
      const saved = await patchSettingsCategories(payload);
      const sorted = sortCategories(saved);
      setCategories(sorted);
      setSettings((prev) => (prev ? { ...prev, categories: sorted } : prev));
      setIsDirty(false);
      setMessage('Categories saved.');
    } catch {
      setError('Failed to save categories.');
    } finally {
      setCategoriesBusy(false);
    }
  };

  return (
    <div className={`p-8 space-y-4 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      <div className="flex gap-2">
        <button
          className={`px-4 py-2 rounded-lg text-sm ${
            tab === 'account'
              ? isDark ? 'bg-slate-100 text-slate-900' : 'bg-gray-900 text-white'
              : isDark ? 'bg-slate-900 border border-slate-700 text-slate-200' : 'bg-white border border-gray-300'
          }`}
          onClick={() => setTab('account')}
        >
          Account
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-sm ${
            tab === 'system'
              ? isDark ? 'bg-slate-100 text-slate-900' : 'bg-gray-900 text-white'
              : isDark ? 'bg-slate-900 border border-slate-700 text-slate-200' : 'bg-white border border-gray-300'
          }`}
          onClick={() => setTab('system')}
        >
          System
        </button>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div> : null}
      {message ? <div className="rounded-lg border border-green-200 bg-green-50 text-green-700 px-3 py-2 text-sm">{message}</div> : null}

      {loadingInitial ? (
        <div className={`rounded-2xl p-6 text-sm border ${isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-gray-200 text-gray-500'}`}>Loading settings...</div>
      ) : tab === 'account' ? (
        <div className={`rounded-2xl p-6 space-y-6 max-w-4xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className={`text-lg font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>Account Settings</h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Manage admin profile, login email, avatar, and password.</p>
            </div>
            <div className="shrink-0">
              <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer ${isDark ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-gray-300 hover:bg-gray-50'}`}>
                <Camera className="w-4 h-4" />
                Change Avatar
                <input className="hidden" type="file" accept="image/*" onChange={(e) => setAccount((p) => ({ ...p, avatarFile: e.target.files?.[0] || null }))} />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`rounded-xl border p-4 space-y-3 ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
              <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>Profile Information</h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>First Name</label>
                  <input className={`mt-1 w-full border rounded-lg px-3 py-2 ${isDark ? 'border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500' : 'border-gray-300 bg-white text-gray-900'}`} placeholder="First name" value={account.first_name} onChange={(e) => setAccount((p) => ({ ...p, first_name: e.target.value }))} />
                </div>
                <div>
                  <label className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Last Name</label>
                  <input className={`mt-1 w-full border rounded-lg px-3 py-2 ${isDark ? 'border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500' : 'border-gray-300 bg-white text-gray-900'}`} placeholder="Last name" value={account.last_name} onChange={(e) => setAccount((p) => ({ ...p, last_name: e.target.value }))} />
                </div>
                <div>
                  <label className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Email</label>
                  <input className={`mt-1 w-full border rounded-lg px-3 py-2 ${isDark ? 'border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500' : 'border-gray-300 bg-white text-gray-900'}`} placeholder="Email" value={account.email} onChange={(e) => setAccount((p) => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className={`rounded-xl border p-4 space-y-3 ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
              <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>Security</h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Current Password</label>
                  <input className={`mt-1 w-full border rounded-lg px-3 py-2 ${isDark ? 'border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500' : 'border-gray-300 bg-white text-gray-900'}`} type="password" placeholder="Current password (optional)" value={account.current_password} onChange={(e) => setAccount((p) => ({ ...p, current_password: e.target.value }))} />
                </div>
                <div>
                  <label className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>New Password</label>
                  <input className={`mt-1 w-full border rounded-lg px-3 py-2 ${isDark ? 'border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500' : 'border-gray-300 bg-white text-gray-900'}`} type="password" placeholder="New password (optional)" value={account.new_password} onChange={(e) => setAccount((p) => ({ ...p, new_password: e.target.value }))} />
                </div>
                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>If password fields are blank, password remains unchanged.</p>
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
        <div className={`rounded-2xl p-6 space-y-6 border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
          <div>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>System Settings</h2>
          </div>
          {!settings ? <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Loading settings...</p> : (
            <>
              <section className={`space-y-3 rounded-xl border p-4 ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
                <h3 className={`font-semibold text-sm ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>Categories</h3>
                <div className="flex gap-2">
                  <input className={`border rounded-lg px-3 py-2 flex-1 ${isDark ? 'border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500' : 'border-gray-300 bg-white text-gray-900'}`} value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Add category" />
                  <button onClick={handleAddCategory} disabled={categoriesBusy} className={`border rounded-lg px-3 py-2 text-sm ${isDark ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-gray-300'}`}>Add</button>
                </div>
                <div className="space-y-2">
                  {categories.length === 0 ? (
                    <div className={`text-sm border rounded-lg px-3 py-3 ${isDark ? 'text-slate-500 border-slate-800 bg-slate-950' : 'text-gray-500 border-gray-200 bg-gray-50'}`}>
                      No categories found yet. Add your first category above.
                    </div>
                  ) : categories.map((cat) => (
                    <div key={cat.id} className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 border rounded-lg px-3 py-2 ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
                      <input className={`border rounded px-2 py-1 text-sm w-full ${isDark ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-gray-300 bg-white text-gray-900'}`} value={cat.name} onChange={(e) => handleCategoryNameChange(cat.id, e.target.value)} />
                      <button onClick={() => handleMoveCategory(cat.id, -1)} className={`text-xs border rounded px-2 py-1 ${isDark ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-gray-300'}`}>Up</button>
                      <button onClick={() => handleMoveCategory(cat.id, 1)} className={`text-xs border rounded px-2 py-1 ${isDark ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-gray-300'}`}>Down</button>
                      <button onClick={() => handleRemoveCategory(cat.id)} className={`text-xs border rounded px-2 py-1 text-red-600 ${isDark ? 'border-red-500/40' : 'border-red-200'}`}>Remove</button>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button disabled={!isDirty || categoriesBusy} onClick={handleSaveCategories} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-60">
                    {categoriesBusy ? 'Saving...' : 'Save Categories'}
                  </button>
                </div>
              </section>

              <section className={`space-y-2 rounded-xl border p-4 ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
                <h3 className={`font-semibold text-sm ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>Claims</h3>
                <label className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  <input type="checkbox" checked={settings.claim_require_proof_image} onChange={(e) => setSettings((p) => p ? { ...p, claim_require_proof_image: e.target.checked } : p)} />
                  Require proof image for claims
                </label>
              </section>

              <section className={`space-y-3 rounded-xl border p-4 ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
                <h3 className={`font-semibold text-sm ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>AI</h3>
                <label className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  <input type="checkbox" checked={settings.ai_matching_enabled} onChange={(e) => setSettings((p) => p ? { ...p, ai_matching_enabled: e.target.checked } : p)} />
                  Enable AI matching
                </label>
                <div>
                  <label className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>AI threshold: {aiThreshold}</label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={aiThreshold}
                    className="w-full mt-2"
                    onChange={(e) => setSettings((p) => p ? { ...p, ai_min_score: Number(e.target.value) } : p)}
                    onMouseUp={() => saveThreshold(aiThreshold)}
                    onTouchEnd={() => saveThreshold(aiThreshold)}
                  />
                </div>
              </section>

              <section className={`space-y-2 rounded-xl border p-4 ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
                <h3 className={`font-semibold text-sm ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>User Home</h3>
                <label className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  <input type="checkbox" checked={settings.user_home_chatbot_visible} onChange={(e) => setSettings((p) => p ? { ...p, user_home_chatbot_visible: e.target.checked } : p)} />
                  Show chatbot
                </label>
                <label className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  <input type="checkbox" checked={settings.user_home_chat_notification_dot} onChange={(e) => setSettings((p) => p ? { ...p, user_home_chat_notification_dot: e.target.checked } : p)} />
                  Show chatbot notification dot
                </label>
              </section>

              <section className={`space-y-2 rounded-xl border p-4 ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
                <h3 className={`font-semibold text-sm ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>Email</h3>
                <label className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  <input type="checkbox" checked={settings.email_master_enabled} onChange={(e) => setSettings((p) => p ? { ...p, email_master_enabled: e.target.checked } : p)} />
                  Enable outgoing email
                </label>
              </section>

              <div className="flex justify-between">
                <button onClick={refreshCategories} className={`border rounded-lg px-4 py-2 text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800' : 'border-gray-300 bg-white text-gray-700'}`}>
                  Reset Category Draft
                </button>
                <button disabled={busy} onClick={saveSystemSettings} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-60">
                  {busy ? 'Saving...' : 'Save System Settings'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
