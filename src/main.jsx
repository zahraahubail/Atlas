import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { geoOrthographic, geoPath, geoCentroid, geoGraticule10 } from 'd3-geo';
import { ArrowRight, Check, Compass, Flag, Globe2, MapPin, Moon, MousePointer2, RotateCcw, Search, Shuffle, Sun, X, ZoomIn, ZoomOut, UserRound, LogOut } from 'lucide-react';
import { countries, countryById, flagEmoji } from './data';
import { copy, countryName, capitalName, continentName } from './i18n';
import './style.css';
import AuthDialog from './AuthDialog';
import { useProgress } from './useProgress';

const TOTAL = countries.length;
function normalizeSearch(value) { return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036F\u064B-\u065F\u0670]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').trim(); }
function saved(key, fallback) { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch { return fallback; } }
function App() {
  const { memorized, user, authReady, accountLoaded, progressLoading, pendingCountry, syncError, retrySync, toggleCountry, logout } = useProgress();
  const [authOpen, setAuthOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountError, setAccountError] = useState('');
  const accountRef = useRef(null);
  const [theme, setTheme] = useState(() => saved('atlas-theme-v2', 'dark'));
  const [language, setLanguage] = useState(() => saved('atlas-site-language-v1', 'en'));
  const [selected, setSelected] = useState('FR');
  const [rotation, setRotation] = useState([-12, -22]);
  const [zoom, setZoom] = useState(1);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [tip, setTip] = useState({x:0,y:0});
  const [isDragging, setIsDragging] = useState(false);
  const globeRef = useRef(null);
  const searchCardRef = useRef(null);
  const drag = useRef(null);
  const pointers = useRef(new Map());
  const pinch = useRef(null);
  const hasDragged = useRef(false);
  const [size, setSize] = useState(620);

  useEffect(() => { localStorage.setItem('atlas-theme-v2', JSON.stringify(theme)); document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { localStorage.setItem('atlas-site-language-v1', JSON.stringify(language)); document.documentElement.lang = language; document.documentElement.dataset.language = language; document.documentElement.dir = 'ltr'; document.title = language === 'ar' ? 'أطلس — استكشف العالم' : 'Atlas — Explore the world'; }, [language]);
  useEffect(() => { const closeOnOutsidePress = e => { if (searchCardRef.current && !searchCardRef.current.contains(e.target)) setSearchOpen(false); }; document.addEventListener('pointerdown', closeOnOutsidePress); return () => document.removeEventListener('pointerdown', closeOnOutsidePress); }, []);
  useEffect(() => { const close = e => { if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false); }; document.addEventListener('pointerdown', close); return () => document.removeEventListener('pointerdown', close); }, []);
  useEffect(() => { const observer = new ResizeObserver(([entry]) => setSize(Math.max(300, Math.min(entry.contentRect.width, entry.contentRect.height)))); if(globeRef.current) observer.observe(globeRef.current); return () => observer.disconnect(); }, []);
  const projection = useMemo(() => geoOrthographic().translate([size/2,size/2]).scale(size * .465 * zoom).rotate(rotation).clipAngle(90).precision(.5), [size, rotation, zoom]);
  const path = useMemo(() => geoPath(projection), [projection]);
  const t = copy[language];
  const found = useMemo(() => countries.filter(c => (filter === 'all' || (filter === 'memorized' ? memorized.includes(c.id) : !memorized.includes(c.id))) && normalizeSearch(`${c.name} ${c.capital} ${countryName(c, 'ar')} ${capitalName(c, 'ar')}`).includes(normalizeSearch(query))), [filter, query, memorized]);
  const current = countryById[selected];
  const progress = Math.round(memorized.length / TOTAL * 100);
  const selectCountry = (c, rotate = true) => { setSelected(c.id); setSearchOpen(false); setQuery(''); if (rotate) { const [lon, lat] = geoCentroid(c.shape); setRotation([-lon, -lat]); setZoom(c.id === 'BH' ? 60 : 1); } };
  const toggleMemorized = () => toggleCountry(selected);
  const randomCountry = () => { const pool = countries.filter(c => !memorized.includes(c.id)); selectCountry((pool.length ? pool : countries)[Math.floor(Math.random() * (pool.length ? pool.length : countries.length))]); };
  const clampZoom = value => Math.max(.7, Math.min(80, value));
  const onPointerDown = e => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x-b.x, a.y-b.y), zoom };
      drag.current = null;
      hasDragged.current = true;
    } else if (pointers.current.size === 1) {
      drag.current = { x:e.clientX, y:e.clientY, rotation, zoom, countryId: e.target.closest?.('[data-country-id]')?.dataset.countryId };
      hasDragged.current = false;
    }
    setIsDragging(true);
  };
  const onPointerMove = e => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x:e.clientX, y:e.clientY });
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      setZoom(clampZoom(pinch.current.zoom * Math.hypot(a.x-b.x, a.y-b.y) / Math.max(1, pinch.current.distance)));
      return;
    }
    if (!drag.current) return;
    const dx = e.clientX-drag.current.x, dy=e.clientY-drag.current.y;
    if (Math.abs(dx)+Math.abs(dy)>4) hasDragged.current = true;
    const dragSpeed = .35 / Math.max(1, drag.current.zoom);
    setRotation([drag.current.rotation[0] + dx*dragSpeed, Math.max(-85, Math.min(85, drag.current.rotation[1] - dy*dragSpeed))]);
  };
  const onPointerUp = e => {
    const clickedCountry = !hasDragged.current && e.type !== 'pointercancel' && drag.current?.countryId;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    drag.current = null;
    if (!pointers.current.size) { setIsDragging(false); hasDragged.current = false; }
    if (clickedCountry) selectCountry(countryById[clickedCountry], false);
  };
  const adjustZoom = factor => setZoom(z => clampZoom(z * factor));
  const onWheel = e => { e.preventDefault(); adjustZoom(e.deltaY < 0 ? 1.22 : 1 / 1.22); };
  useEffect(() => { const handle = e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true); document.getElementById('country-search')?.focus(); } }; window.addEventListener('keydown', handle); return () => window.removeEventListener('keydown', handle); }, []);
  useEffect(() => { const el=globeRef.current; if(!el) return; el.addEventListener('wheel',onWheel,{passive:false}); return () => el.removeEventListener('wheel',onWheel); },[]);
  return <div className={language==='ar'?'app-shell language-ar':'app-shell'}>
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Globe2 size={24} strokeWidth={2.1}/></span><div className="brand-name">{t.brand}<span>.</span></div></div>
      <div className="sidebar-label">{t.journey}</div>
      <nav className="nav"><button className="nav-item active"><Compass size={19}/> {t.exploreGlobe} <span className="nav-dot"/></button><button className="nav-item" onClick={() => { setSearchOpen(true); document.getElementById('country-search')?.focus(); }}><Flag size={19}/> {t.countries} <ArrowRight size={15} className="nav-arrow"/></button></nav>
      <div className="sidebar-divider"/>
      <div className="sidebar-label progress-label">{t.progress} <span>01 / 02</span></div>
      <div className="progress-card"><div className="progress-icon"><Flag size={19}/></div><div className="progress-title">{t.countriesLearned}</div><div className="progress-number">{memorized.length}<span> / {TOTAL}</span></div><div className="progress-track"><div style={{width:`${progress}%`}}/></div><p>{progress}% {t.exploredPercent}</p></div>
      <div className="sidebar-label filter-label">{t.quickView}</div>
      <div className="filter-list"><button className={filter==='all'?'filter active':'filter'} onClick={()=>{setFilter('all');setSearchOpen(true)}}><span className="filter-bullet yellow"/> {t.allCountries} <span>{TOTAL}</span></button><button className={filter==='memorized'?'filter active':'filter'} onClick={()=>{setFilter('memorized');setSearchOpen(true)}}><span className="filter-bullet green"/> {t.memorized} <span>{memorized.length}</span></button><button className={filter==='learning'?'filter active':'filter'} onClick={()=>{setFilter('learning');setSearchOpen(true)}}><span className="filter-bullet grey"/> {t.toDiscover} <span>{TOTAL-memorized.length}</span></button></div>
      <div className="sidebar-bottom"><div className="sidebar-footer">{t.footer} <span>✳</span></div></div>
    </aside>
    <main className="main"><header className="topbar"><div className="breadcrumb">{t.explore} <span>/</span> <strong>{t.worldMap}</strong></div><div className="top-actions"><span className="compact-progress" aria-label={language==='ar'?`${memorized.length} من أصل ${TOTAL} دولة محفوظة`:`${memorized.length} of ${TOTAL} countries memorized`}><Flag size={15}/>{memorized.length}<span>/ {TOTAL}</span></span><span className="today-label"><span className="live-dot"/> {t.pace}</span><button className="language-button" onClick={()=>setLanguage(language==='ar'?'en':'ar')} aria-label={t.switchLanguage} title={t.switchLanguage} lang={language==='en'?'ar':'en'}>{language==='ar'?'EN':'عربي'}</button><button className="theme-button" onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label={t.switchTheme}>{theme==='light'?<Moon size={18}/>:<Sun size={18}/>}</button><div className="account-wrap" ref={accountRef}><button className="account-button" onClick={()=>user?setAccountOpen(value=>!value):setAuthOpen(true)} aria-label={user?t.account:t.login} aria-expanded={user?accountOpen:undefined}><UserRound size={17}/><span className="account-label">{!authReady?t.loadingProgress:user?(user.email || t.account):t.login}</span></button>{user&&accountOpen&&<div className="account-menu" dir={language==='ar'?'rtl':'ltr'}><div className="account-menu-kicker">{t.account}</div><strong dir="ltr">{user.email || t.account}</strong><p>{memorized.length} / {TOTAL} {t.countriesLearned.toLowerCase()}</p>{accountError&&<p className="account-menu-error" role="alert">{accountError}</p>}<button onClick={async()=>{try{setAccountError('');await logout();setAccountOpen(false)}catch{setAccountError(t.logoutError)}}}><LogOut size={16}/>{t.logout}</button></div>}</div></div></header>
      <div className="content"><section className="intro"><div className="eyebrow"><span className="sparkle">✦</span> {t.eyebrow}</div><h1>{t.heroLine1}<br/><em>{t.heroLine2}</em></h1><p>{t.heroBody}</p></section>
      <section className="workspace"><div className="globe-card"><div className="globe-header"><div><span className="section-kicker">{t.interactiveGlobe}</span><h2>{t.exploreWorld} <span>✳</span></h2></div><button className="surprise-button" onClick={randomCountry}><Shuffle size={15}/> {t.surprise}</button></div>
        <div className="globe-area" ref={globeRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <div className="orbit orbit-one"/><div className="orbit orbit-two"/>
          <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className={isDragging?'globe-svg dragging':'globe-svg'} aria-label={t.mapLabel}><defs><radialGradient id="ocean" cx="34%" cy="30%"><stop offset="0%" stopColor="var(--ocean-light)"/><stop offset="100%" stopColor="var(--ocean-dark)"/></radialGradient><clipPath id="globeClip"><path d={path({type:'Sphere'})}/></clipPath></defs><path d={path({type:'Sphere'})} fill="url(#ocean)" className="sphere"/><path d={path(geoGraticule10())} className="graticule" clipPath="url(#globeClip)"/>{countries.map(c => <path key={c.id} data-country-id={c.id} d={path(c.shape)||''} className={`country ${memorized.includes(c.id)?'learned':''} ${selected===c.id?'selected':''} ${hovered===c.id?'hovered':''}`} onPointerEnter={e=>{setHovered(c.id);setTip({x:e.clientX,y:e.clientY})}} onPointerMove={e=>setTip({x:e.clientX,y:e.clientY})} onPointerLeave={()=>setHovered(null)} />)}<path d={path({type:'Sphere'})} className="sphere-outline"/></svg>
          {hovered && !isDragging && <div className="map-tooltip" style={{left:tip.x,top:tip.y}}>{flagEmoji(hovered)} {countryName(countryById[hovered], language)}</div>}
          <div className="map-annotation"><span className="annotation-dot"/> {t.dragExplore}</div><div className="map-controls"><button onPointerDown={e=>e.stopPropagation()} onClick={()=>adjustZoom(1.6)} aria-label={t.zoomIn}><ZoomIn size={19}/></button><span/><button onPointerDown={e=>e.stopPropagation()} onClick={()=>adjustZoom(1/1.6)} aria-label={t.zoomOut}><ZoomOut size={19}/></button><span/><button onPointerDown={e=>e.stopPropagation()} onClick={()=>{setRotation([-12,-22]);setZoom(1)}} aria-label={t.resetGlobe}><RotateCcw size={18}/></button></div>
        </div><div className="globe-footer"><div className="legend"><span><i className="swatch yellow"/> {t.toExplore}</span><span><i className="swatch green"/> {t.memorized}</span><span><i className="swatch outline"/> {t.selected}</span></div><div className="globe-hint"><MousePointer2 size={14}/> {t.dragHint}</div></div></div>
        <div className="right-column"><div className="search-card" ref={searchCardRef}><div className="section-kicker">{t.findPlace}</div><div className="search-wrap"><Search size={18}/><input id="country-search" dir="auto" placeholder={t.searchPlaceholder} value={query} onChange={e=>{setQuery(e.target.value);setSearchOpen(true)}} onFocus={()=>setSearchOpen(true)} onKeyDown={e=>{if(e.key==='Enter'&&found[0])selectCountry(found[0]);if(e.key==='Escape')setSearchOpen(false)}}/><span>⌘ K</span></div>{searchOpen&&<div className="search-results"><div className="results-head">{filter==='all'?t.countries:filter==='memorized'?t.memorized:t.toDiscover} <button onClick={()=>{setSearchOpen(false);setFilter('all')}}><X size={14}/></button></div>{found.length ? found.map(c=><button key={c.id} onClick={()=>selectCountry(c)} dir={language==='ar'?'rtl':'ltr'} lang={language}><span className="result-flag">{flagEmoji(c.id)}</span><span className={language==='ar'?'localized-ar result-copy':'result-copy'} dir={language==='ar'?'rtl':'ltr'}><strong>{countryName(c, language)}</strong><small>{capitalName(c, language)}</small></span>{memorized.includes(c.id)&&<Check size={16} className="result-check"/>}</button>) : <p className="no-results">{t.noResults}</p>}</div>}</div>
          <div className="detail-card"><div className="detail-top"><span className="section-kicker">{t.spotlight}</span><span className="detail-index">{String(countries.findIndex(c=>c.id===selected)+1).padStart(2,'0')} / {TOTAL}</span></div><div className="flag-display"><span>{flagEmoji(selected)}</span><div className="flag-decoration">✺</div></div><div className={language==='ar'?'detail-body arabic-details':'detail-body'} dir={language==='ar'?'rtl':'ltr'} lang={language}><div className="country-tag"><span className={memorized.includes(selected)?'status-dot complete':'status-dot'}/>{memorized.includes(selected)?t.learned:t.ready}</div><h2 className={language==='ar'?'localized-ar':''} dir={language==='ar'?'rtl':'ltr'}>{countryName(current, language)}</h2><div className="country-meta"><div className="meta-icon"><MapPin size={17}/></div><div><small>{t.capitalCity}</small><strong className={language==='ar'?'localized-ar':''} dir={language==='ar'?'rtl':'ltr'}>{capitalName(current, language)}</strong></div></div><div className="country-meta"><div className="meta-icon"><Globe2 size={17}/></div><div><small>{t.region}</small><strong className={language==='ar'?'localized-ar':''} dir={language==='ar'?'rtl':'ltr'}>{continentName(current, language)}</strong></div></div><button className={memorized.includes(selected)?'memorize-button done':'memorize-button'} onClick={toggleMemorized} disabled={!!user && (!accountLoaded || !!pendingCountry)}>{memorized.includes(selected)?<><Check size={19}/> {t.removeMemorized} <span>✓</span></>:<>{t.markMemorized} <ArrowRight size={18}/></>}</button><p className="button-note" role={syncError?"alert":undefined}>{user && (progressLoading || !accountLoaded && !syncError) ? t.loadingProgress : syncError ? <><span>{t.syncError}</span> <button className="retry-sync" onClick={retrySync}>{t.retry}</button></> : memorized.includes(selected)?t.learnedNote:t.learnNote}</p></div></div></div>
      </section></div></main>{authOpen&&<AuthDialog language={language} onClose={()=>setAuthOpen(false)}/>}
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
