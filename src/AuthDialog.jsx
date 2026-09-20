import React, { useEffect, useState } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, X } from 'lucide-react';
import { accountsConfigured, supabase } from './supabase';
import './auth.css';

const wording = {
  en: {
    label: 'YOUR ATLAS ACCOUNT', login: 'Log in', register: 'Create account',
    loginTitle: 'Welcome back.', registerTitle: 'Take your world with you.',
    intro: 'Save your countries and pick up where you left off on any device.',
    email: 'Email address', password: 'Password', confirm: 'Confirm password',
    emailPlaceholder: 'you@example.com', passwordHint: 'At least 8 characters',
    submitLogin: 'Log in', submitRegister: 'Create account',
    guest: 'Continue as guest', guestNote: 'Guest progress stays on this device. Account progress is saved separately.',
    show: 'Show password', hide: 'Hide password',
    emailError: 'Enter a valid email address.', passwordError: 'Use a password with at least 8 characters.',
    confirmError: 'The passwords do not match.', loginError: 'The email or password is incorrect.',
    setup: 'Account setup is not connected yet. Add your Supabase project keys to enable registration and login.',
    confirmEmail: 'Check your inbox for a confirmation link, then log in. If you already have an account, use Log in.',
    unexpected: 'Something went wrong. Please try again.', loading: 'Please wait…',
    close: 'Close',
  },
  ar: {
    label: 'حسابك في أطلس', login: 'تسجيل الدخول', register: 'إنشاء حساب',
    loginTitle: 'مرحبًا بعودتك.', registerTitle: 'اصطحب عالمك معك.',
    intro: 'احفظ الدول التي تعلمتها وأكمل من أي جهاز.',
    email: 'البريد الإلكتروني', password: 'كلمة المرور', confirm: 'تأكيد كلمة المرور',
    emailPlaceholder: 'you@example.com', passwordHint: '٨ أحرف على الأقل',
    submitLogin: 'تسجيل الدخول', submitRegister: 'إنشاء حساب',
    guest: 'المتابعة كضيف', guestNote: 'تقدّم الضيف محفوظ على هذا الجهاز، وتقدّم الحساب محفوظ بشكل منفصل.',
    show: 'إظهار كلمة المرور', hide: 'إخفاء كلمة المرور',
    emailError: 'أدخل بريدًا إلكترونيًا صالحًا.', passwordError: 'استخدم كلمة مرور من ٨ أحرف على الأقل.',
    confirmError: 'كلمتا المرور غير متطابقتين.', loginError: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    setup: 'لم يتم ربط خدمة الحسابات بعد. أضف بيانات مشروع Supabase لتفعيل التسجيل والدخول.',
    confirmEmail: 'تحقّق من بريدك الإلكتروني للحصول على رابط التأكيد، ثم سجّل الدخول. إذا كان لديك حساب، استخدم تسجيل الدخول.',
    unexpected: 'حدث خطأ. حاول مرة أخرى.', loading: 'يرجى الانتظار…',
    close: 'إغلاق',
  },
};

function PasswordField({ id, label, value, onChange, visible, onToggle, language, autoComplete, placeholder }) {
  const t = wording[language];
  return <label className="auth-field" htmlFor={id}>
    <span>{label}</span>
    <div className="auth-input-wrap"><LockKeyhole size={17}/><input id={id} type={visible ? 'text' : 'password'} value={value} onChange={onChange} minLength={8} autoComplete={autoComplete} placeholder={placeholder} dir="ltr" required/><button className={visible ? 'password-eye visible' : 'password-eye'} type="button" onClick={onToggle} aria-label={visible ? t.hide : t.show} title={visible ? t.hide : t.show}>{visible ? <Eye size={18}/> : <EyeOff size={18}/>}</button></div>
  </label>;
}

export default function AuthDialog({ language, onClose }) {
  const t = wording[language];
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const handleKey = event => { if (event.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [busy, onClose]);

  function changeMode(next) { setMode(next); setError(''); setNotice(''); setPassword(''); setConfirm(''); setShowPassword(false); setShowConfirm(false); }

  async function submit(event) {
    event.preventDefault();
    if (!accountsConfigured) { setError(t.setup); return; }
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) { setError(t.emailError); return; }
    if (password.length < 8) { setError(t.passwordError); return; }
    if (mode === 'register' && password !== confirm) { setError(t.confirmError); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const credentials = { email: normalizedEmail, password };
      const { data, error: authError } = mode === 'register'
        ? await supabase.auth.signUp({ ...credentials, options: { emailRedirectTo: window.location.origin } })
        : await supabase.auth.signInWithPassword(credentials);
      if (authError) {
        setError(mode === 'login' && /invalid login credentials/i.test(authError.message) ? t.loginError : authError.message || t.unexpected);
      } else if (mode === 'register' && !data.session) {
        setNotice(t.confirmEmail);
      } else {
        onClose();
      }
    } catch {
      setError(t.unexpected);
    } finally {
      setBusy(false);
    }
  }

  return <div className="auth-backdrop" onPointerDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div className={language === 'ar' ? 'auth-dialog auth-ar' : 'auth-dialog'} role="dialog" aria-modal="true" aria-labelledby="auth-title" lang={language} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <button className="auth-close" type="button" onClick={onClose} aria-label={t.close}><X size={18}/></button>
      <div className="auth-emblem">✦</div><div className="auth-kicker">{t.label}</div>
      <h2 id="auth-title">{mode === 'login' ? t.loginTitle : t.registerTitle}</h2><p className="auth-intro">{t.intro}</p>
      <div className="auth-tabs" role="tablist" aria-label={t.label}><button type="button" role="tab" aria-selected={mode==='login'} className={mode==='login'?'active':''} onClick={()=>changeMode('login')}>{t.login}</button><button type="button" role="tab" aria-selected={mode==='register'} className={mode==='register'?'active':''} onClick={()=>changeMode('register')}>{t.register}</button></div>
      <form onSubmit={submit} noValidate>
        <label className="auth-field" htmlFor="auth-email"><span>{t.email}</span><div className="auth-input-wrap"><Mail size={17}/><input id="auth-email" type="email" inputMode="email" autoComplete="email" placeholder={t.emailPlaceholder} value={email} onChange={event=>setEmail(event.target.value)} dir="ltr" required/></div></label>
        <PasswordField id="auth-password" label={t.password} value={password} onChange={event=>setPassword(event.target.value)} visible={showPassword} onToggle={()=>setShowPassword(value=>!value)} language={language} autoComplete={mode==='register'?'new-password':'current-password'} placeholder={t.passwordHint}/>
        {mode === 'register' && <PasswordField id="auth-confirm" label={t.confirm} value={confirm} onChange={event=>setConfirm(event.target.value)} visible={showConfirm} onToggle={()=>setShowConfirm(value=>!value)} language={language} autoComplete="new-password" placeholder={t.confirm}/>}
        {!accountsConfigured && <div className="auth-setup">{t.setup}</div>}
        {error && <div className="auth-error" role="alert">{error}</div>}
        {notice && <div className="auth-notice" role="status">{notice}</div>}
        <button type="submit" className="auth-submit" disabled={busy || !accountsConfigured}>{busy ? t.loading : mode==='login' ? t.submitLogin : t.submitRegister}<ArrowRight size={18}/></button>
      </form>
      <button type="button" className="auth-guest" onClick={onClose}>{t.guest}</button><p className="auth-guest-note">{t.guestNote}</p>
    </div>
  </div>;
}
