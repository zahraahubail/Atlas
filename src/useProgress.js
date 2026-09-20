import { useEffect, useState } from 'react';
import { countryById } from './data';
import { calculateStreak, localDateKey, streakMilestone } from './streak';
import { supabase } from './supabase';

function storedList(key, valid) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? [...new Set(value.filter(valid))] : [];
  } catch {
    return [];
  }
}

function isMissingSchema(error) {
  return ['PGRST202', 'PGRST205', '42P01', '42883'].includes(error?.code) ||
    /could not find the (table|function)|does not exist/i.test(error?.message || '');
}

export function useProgress() {
  const [guestMemorized, setGuestMemorized] = useState(() => storedList('atlas-memorized-v1', id => countryById[id]));
  const [guestDays, setGuestDays] = useState(() => storedList('atlas-learning-days-v1', day => /^\d{4}-\d{2}-\d{2}$/.test(day)));
  const [today, setToday] = useState(localDateKey);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [accountProgress, setAccountProgress] = useState({ userId: null, ids: [], days: [] });
  const [progressLoading, setProgressLoading] = useState(false);
  const [pendingCountry, setPendingCountry] = useState(null);
  const [syncError, setSyncError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [celebration, setCelebration] = useState(null);

  useEffect(() => {
    localStorage.setItem('atlas-memorized-v1', JSON.stringify(guestMemorized));
  }, [guestMemorized]);
  useEffect(() => {
    localStorage.setItem('atlas-learning-days-v1', JSON.stringify(guestDays));
  }, [guestDays]);
  useEffect(() => {
    const updateToday = () => setToday(localDateKey());
    const interval = setInterval(updateToday, 60_000);
    document.addEventListener('visibilitychange', updateToday);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', updateToday); };
  }, []);

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
    Promise.all([
      supabase.from('memorized_countries').select('country_code').eq('user_id', userId),
      supabase.from('learning_days').select('learned_on').eq('user_id', userId),
    ]).then(([countriesResult, daysResult]) => {
      if (!active) return;
      if (countriesResult.error || daysResult.error) {
        setSyncError(isMissingSchema(countriesResult.error) || isMissingSchema(daysResult.error) ? 'setup' : 'load');
      } else {
        setAccountProgress({
          userId,
          ids: (countriesResult.data || []).map(row => row.country_code).filter(id => countryById[id]),
          days: (daysResult.data || []).map(row => row.learned_on),
        });
      }
      setProgressLoading(false);
    }).catch(() => { if (active) { setSyncError('load'); setProgressLoading(false); } });
    return () => { active = false; };
  }, [user?.id, refreshKey]);

  const accountLoaded = Boolean(user && accountProgress.userId === user.id && !progressLoading && !syncError);
  const memorized = user ? (accountProgress.userId === user.id ? accountProgress.ids : []) : guestMemorized;
  const days = user ? (accountProgress.userId === user.id ? accountProgress.days : []) : guestDays;
  const streak = calculateStreak(days, today);

  async function toggleCountry(id) {
    if (!countryById[id]) return;
    const day = localDateKey();
    setToday(day);
    if (!user) {
      const alreadyLearned = guestMemorized.includes(id);
      setGuestMemorized(prev => alreadyLearned ? prev.filter(code => code !== id) : [...prev, id]);
      if (!alreadyLearned) {
        const milestone = streakMilestone(guestDays, day);
        setGuestDays(prev => prev.includes(day) ? prev : [...prev, day]);
        if (milestone) setCelebration(milestone);
      }
      return;
    }
    if (!accountLoaded || pendingCountry) return;
    const userId = user.id;
    const alreadyLearned = accountProgress.ids.includes(id);
    const nextIds = alreadyLearned ? accountProgress.ids.filter(code => code !== id) : [...accountProgress.ids, id];
    const nextDays = alreadyLearned || accountProgress.days.includes(day) ? accountProgress.days : [...accountProgress.days, day];
    const milestone = alreadyLearned ? null : streakMilestone(accountProgress.days, day);
    setPendingCountry(id);
    setSyncError('');
    setAccountProgress({ userId, ids: nextIds, days: nextDays });
    try {
      const result = alreadyLearned
        ? await supabase.from('memorized_countries').delete().eq('user_id', userId).eq('country_code', id)
        : await supabase.rpc('memorize_country', { p_country_code: id, p_local_day: day });
      if (result.error) throw result.error;
      if (milestone) setCelebration(milestone);
    } catch (error) {
      setAccountProgress(prev => prev.userId === userId ? accountProgress : prev);
      setSyncError(isMissingSchema(error) ? 'setup' : 'save');
    } finally {
      setPendingCountry(null);
    }
  }

  function retrySync() { setRefreshKey(value => value + 1); }
  function dismissCelebration() { setCelebration(null); }

  async function logout() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  return { memorized, streak, celebration, dismissCelebration, user, authReady, accountLoaded, progressLoading, pendingCountry, syncError, retrySync, toggleCountry, logout };
}
