import { useEffect, useMemo, useState } from 'react';
import { Camera } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchCurrentUser,
  fetchSettingsCategories,
  fetchSiteSettings,
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
  const [, setCategories] = useState<SettingsCategory[]>([]);

  const aiThreshold = useMemo(() => Math.max(0, Math.min(100, Math.round(settings?.ai_min_score ?? 75))), [settings?.ai_min_score]);

  const refreshCategories = async () => {
    try {
      const cats = await fetchSettingsCategories();
      const sorted = sortCategories(cats);
      setCategories(sorted);
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

  return (
    <div className={`min-h-screen p-4 sm:p-8 flex justify-center ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      <div className="w-full max-w-4xl space-y-6">
        <div className={`flex gap-2 p-1 rounded-xl w-fit ${isDark ? 'bg-slate-900/50' : 'bg-slate-100'}`}>
          <button
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'account'
                ? isDark 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'bg-white text-blue-600 shadow-sm'
                : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setTab('account')}
          >
            Account
          </button>
          <button
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'system'
                ? isDark 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'bg-white text-blue-600 shadow-sm'
                : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setTab('system')}
          >
            System
          </button>
        </div>

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div> : null}
        {message ? <div className="rounded-xl border border-green-200 bg-green-50 text-green-700 px-4 py-3 text-sm">{message}</div> : null}

        {loadingInitial ? (
          <div className={`rounded-2xl p-12 text-center text-sm border ${isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-gray-200 text-gray-500'}`}>Loading settings...</div>
        ) : tab === 'account' ? (
          <div className={`rounded-2xl p-6 sm:p-8 space-y-8 border shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
            <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
              <div>
                <h2 className="text-xl font-bold">Account Settings</h2>
                <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Manage admin profile, login email, avatar, and password.</p>
              </div>
              <div className="shrink-0">
                <label className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold cursor-pointer transition-colors ${isDark ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-gray-300 hover:bg-gray-50'}`}>
                  <Camera className="w-4 h-4" />
                  Change Avatar
                  <input className="hidden" type="file" accept="image/*" onChange={(e) => setAccount((p) => ({ ...p, avatarFile: e.target.files?.[0] || null }))} />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-blue-500">Profile Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold mb-1.5 block opacity-70">First Name</label>
                    <input className={`w-full border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 ${isDark ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-gray-300 bg-white text-gray-900'}`} placeholder="First name" value={account.first_name} onChange={(e) => setAccount((p) => ({ ...p, first_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-bold mb-1.5 block opacity-70">Last Name</label>
                    <input className={`w-full border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 ${isDark ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-gray-300 bg-white text-gray-900'}`} placeholder="Last name" value={account.last_name} onChange={(e) => setAccount((p) => ({ ...p, last_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-bold mb-1.5 block opacity-70">Email</label>
                    <input className={`w-full border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 ${isDark ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-gray-300 bg-white text-gray-900'}`} placeholder="Email" value={account.email} onChange={(e) => setAccount((p) => ({ ...p, email: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-blue-500">Security</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold mb-1.5 block opacity-70">Current Password</label>
                    <input className={`w-full border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 ${isDark ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-gray-300 bg-white text-gray-900'}`} type="password" placeholder="Current password (optional)" value={account.current_password} onChange={(e) => setAccount((p) => ({ ...p, current_password: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-bold mb-1.5 block opacity-70">New Password</label>
                    <input className={`w-full border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 ${isDark ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-gray-300 bg-white text-gray-900'}`} type="password" placeholder="New password (optional)" value={account.new_password} onChange={(e) => setAccount((p) => ({ ...p, new_password: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button disabled={busy} onClick={saveAccount} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-8 py-3 text-sm shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-60">
                {busy ? 'Saving...' : 'Save Account Settings'}
              </button>
            </div>
          </div>
        ) : (
          <div className={`rounded-2xl p-6 sm:p-8 space-y-8 border shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
            <div>
              <h2 className="text-xl font-bold">System Settings</h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Configure platform-wide behavior, AI thresholds, and notifications.</p>
            </div>
            {!settings ? <p className="text-center py-12 opacity-50">Loading settings data...</p> : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <section className={`p-5 rounded-2xl border ${isDark ? 'border-slate-800 bg-slate-950/50' : 'border-gray-100 bg-gray-50/50'}`}>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-4">AI</h3>
                    <div className="space-y-4">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600" checked={settings.ai_matching_enabled} onChange={(e) => setSettings((p) => p ? { ...p, ai_matching_enabled: e.target.checked } : p)} />
                        <span className="text-sm font-medium">Enable AI matching</span>
                      </label>
                      <div className="pt-2">
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-xs font-bold opacity-70">AI threshold: {aiThreshold}</label>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={aiThreshold}
                          className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          onChange={(e) => setSettings((p) => p ? { ...p, ai_min_score: Number(e.target.value) } : p)}
                          onMouseUp={() => saveThreshold(aiThreshold)}
                        />
                      </div>
                    </div>
                  </section>

                  <section className={`p-5 rounded-2xl border ${isDark ? 'border-slate-800 bg-slate-950/50' : 'border-gray-100 bg-gray-50/50'}`}>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-4">User Home</h3>
                    <div className="space-y-4">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600" checked={settings.user_home_chatbot_visible} onChange={(e) => setSettings((p) => p ? { ...p, user_home_chatbot_visible: e.target.checked } : p)} />
                        <span className="text-sm font-medium">Show chatbot</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600" checked={settings.user_home_chat_notification_dot} onChange={(e) => setSettings((p) => p ? { ...p, user_home_chat_notification_dot: e.target.checked } : p)} />
                        <span className="text-sm font-medium">Show chatbot notification dot</span>
                      </label>
                    </div>
                  </section>
                </div>

                <section className={`p-5 rounded-2xl border ${isDark ? 'border-slate-800 bg-slate-950/50' : 'border-gray-100 bg-gray-50/50'}`}>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-4">Email</h3>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600" checked={settings.email_master_enabled} onChange={(e) => setSettings((p) => p ? { ...p, email_master_enabled: e.target.checked } : p)} />
                    <span className="text-sm font-medium">Enable outgoing email</span>
                  </label>
                </section>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between gap-4">
                  <button onClick={refreshCategories} className={`px-6 py-2.5 rounded-xl text-sm font-semibold border transition-all ${isDark ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}>
                    Reset Category Draft
                  </button>
                  <button disabled={busy} onClick={saveSystemSettings} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-8 py-3 text-sm shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-60">
                    {busy ? 'Saving...' : 'Save System Settings'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}