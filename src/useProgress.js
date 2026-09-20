import { useEffect, useState } from 'react';
import { countryById } from './data';
import { supabase } from './supabase';

function storedGuestProgress() {
  try {
    const value = JSON.parse(localStorage.getItem('atlas-memorized-v1') || '[]');
    return Array.isArray(value) ? value.filter(id => countryById[id]) : [];
  } catch {
    return [];
  }
}

export function useProgress() {
  const [guestMemorized, setGuestMemorized] = useState(storedGuestProgress);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [accountProgress, setAccountProgress] = useState({ userId: null, ids: [] });
  const [progressLoading, setProgressLoading] = useState(false);
  const [pendingCountry, setPendingCountry] = useState(null);
  const [syncError, setSyncError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    localStorage.setItem('atlas-memorized-v1', JSON.stringify(guestMemorized));
  }, [guestMemorized]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) { setUser(data.session?.user || null); setAuthReady(true); }
    }).catch(() => { if (active) setAuthReady(true); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) { setUser(session?.user || null); setAuthReady(true); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!user || !supabase) { setProgressLoading(false); setSyncError(''); return; }
    let active = true;
    const userId = user.id;
    setProgressLoading(true);
    setSyncError('');
    supabase.from('memorized_countries').select('country_code').eq('user_id', userId).then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setSyncError('Could not load account progress.');
        setAccountProgress({ userId, ids: [] });
      } else {
        setAccountProgress({ userId, ids: (data || []).map(row => row.country_code).filter(id => countryById[id]) });
      }
      setProgressLoading(false);
    }).catch(() => { if (active) { setSyncError('Could not load account progress.'); setProgressLoading(false); } });
    return () => { active = false; };
  }, [user?.id, refreshKey]);

  const accountLoaded = Boolean(user && accountProgress.userId === user.id && !progressLoading && !syncError);
  const memorized = user ? (accountProgress.userId === user.id ? accountProgress.ids : []) : guestMemorized;

  async function toggleCountry(id) {
    if (!countryById[id]) return;
    if (!user) {
      setGuestMemorized(prev => prev.includes(id) ? prev.filter(code => code !== id) : [...prev, id]);
      return;
    }
    if (!accountLoaded || pendingCountry) return;
    const userId = user.id;
    const alreadyLearned = accountProgress.ids.includes(id);
    const next = alreadyLearned ? accountProgress.ids.filter(code => code !== id) : [...accountProgress.ids, id];
    setPendingCountry(id);
    setSyncError('');
    setAccountProgress({ userId, ids: next });
    try {
      const result = alreadyLearned
        ? await supabase.from('memorized_countries').delete().eq('user_id', userId).eq('country_code', id)
        : await supabase.from('memorized_countries').insert({ user_id: userId, country_code: id });
      if (result.error) throw result.error;
    } catch {
      setAccountProgress(prev => prev.userId === userId ? { userId, ids: accountProgress.ids } : prev);
      setSyncError('Could not save progress. Please try again.');
    } finally {
      setPendingCountry(null);
    }
  }

  function retrySync() { setRefreshKey(value => value + 1); }

  async function logout() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  return { memorized, user, authReady, accountLoaded, progressLoading, pendingCountry, syncError, retrySync, toggleCountry, logout };
}
