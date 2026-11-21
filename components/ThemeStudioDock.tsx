'use client';

import { useState } from 'react';
import { useThemeDemo, THEME_PRESETS } from '@/lib/theme-demo-context';
import { THEMES } from '@/lib/themes';

export function ThemeStudioDock() {
  const {
    isDemoActive,
    activePresetId,
    activeTheme,
    customThemes,
    isPanelOpen,
    setIsPanelOpen,
    selectPreset,
    updateActivePreset,
    updateThemeColors,
    toggleDemo,
    resetToDefaults,
  } = useThemeDemo();

  const [activeTab, setActiveTab] = useState<'preset' | 'discount' | 'colors'>('preset');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // If demo mode is not active, show a small reactivation pill
  if (!isDemoActive) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <button
          type="button"
          onClick={() => toggleDemo(true)}
          className="rounded-full bg-slate-900/90 hover:bg-slate-900 text-white border border-slate-700 px-3.5 py-1.5 text-xs font-bold shadow-lg flex items-center gap-2 transition-all hover:scale-105 cursor-pointer backdrop-blur-md"
          title="Theme Demo-Modus aktivieren"
        >
          <span>🎨</span>
          <span>Theme Demo öffnen</span>
        </button>
      </div>
    );
  }

  const currentPreset = THEME_PRESETS.find((p) => p.id === activePresetId) || THEME_PRESETS[0];

  const handleSaveToAdmin = async () => {
    setSaveStatus('Speichere...');
    try {
      const res = await fetch('/api/admin/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internal_name: currentPreset.name,
          discount_percent: currentPreset.discountPct,
          rounding_strategy: currentPreset.roundingStrategy,
          show_reference_price: currentPreset.showReferencePrice,
          theme_id: currentPreset.themeId,
          titles: { de: currentPreset.titleDe, en: currentPreset.titleEn },
          texts: { de: 'Im Demo-Studio konfiguriert.', en: 'Configured in demo studio.' },
          badge_texts: { de: currentPreset.badgeDe, en: currentPreset.badgeEn },
          starts_at: new Date().toISOString(),
          ends_at: new Date(Date.now() + 86400000 * 7).toISOString(),
          status: 'draft',
          priority: currentPreset.discountPct >= 20 ? 20 : 10,
        }),
      });

      if (res.ok) {
        setSaveStatus('✅ Gespeichert!');
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        const data = await res.json();
        setSaveStatus(`❌ ${data.error || 'Fehler'}`);
        setTimeout(() => setSaveStatus(null), 4000);
      }
    } catch (err: any) {
      setSaveStatus(`❌ ${err.message}`);
      setTimeout(() => setSaveStatus(null), 4000);
    }
  };

  return (
    <>
      {/* Floating Minimized Pill */}
      {!isPanelOpen && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPanelOpen(true)}
            className="rounded-full bg-slate-950/95 hover:bg-slate-900 text-white border-2 border-indigo-500/80 px-4 py-2 text-xs font-bold shadow-2xl flex items-center gap-2.5 transition-all hover:scale-105 cursor-pointer backdrop-blur-md"
          >
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
            </span>
            <span>🎨 Theme Studio:</span>
            <span className="text-amber-300 font-extrabold">{currentPreset.name}</span>
            <span className="rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-slate-300 font-mono">
              {currentPreset.discountPct > 0 ? `−${currentPreset.discountPct}%` : 'Standard'}
            </span>
            <span className="text-slate-400 ml-1">▲ Bearbeiten</span>
          </button>
        </div>
      )}

      {/* Slide-Up Expanded Studio Drawer */}
      {isPanelOpen && (
        <div className="fixed bottom-0 inset-x-0 sm:left-4 sm:right-auto sm:bottom-4 z-50 sm:w-[500px] max-h-[85vh] bg-slate-950/95 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-3xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden text-slate-100 animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-sm font-black shadow-md shadow-indigo-500/30">
                🎨
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                  <span>Theme Studio</span>
                  <span className="rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.2 text-[10px] font-mono">
                    Live Demo
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Direkt auf der Website umschalten & anpassen</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsPanelOpen(false)}
                className="h-8 w-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
                title="Minimieren"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Preset Quick Tabs */}
          <div className="p-3 border-b border-slate-800 bg-slate-900/40 overflow-x-auto scrollbar-none">
            <div className="flex gap-1.5 min-w-max">
              {THEME_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => selectPreset(preset.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activePresetId === preset.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-102'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <span>{preset.name.split(' (')[0]}</span>
                  {preset.discountPct > 0 && (
                    <span className={`text-[10px] px-1 rounded ${
                      activePresetId === preset.id ? 'bg-black/30 text-amber-300' : 'bg-slate-700 text-slate-300'
                    }`}>
                      −{preset.discountPct}%
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 text-xs font-bold text-slate-400 bg-slate-900/20">
            <button
              type="button"
              onClick={() => setActiveTab('preset')}
              className={`flex-1 py-2.5 border-b-2 text-center transition-colors cursor-pointer ${
                activeTab === 'preset' ? 'border-indigo-500 text-white bg-slate-800/40' : 'border-transparent hover:text-slate-200'
              }`}
            >
              Übersicht & Vorschau
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('discount')}
              className={`flex-1 py-2.5 border-b-2 text-center transition-colors cursor-pointer ${
                activeTab === 'discount' ? 'border-indigo-500 text-white bg-slate-800/40' : 'border-transparent hover:text-slate-200'
              }`}
            >
              Rabatt & Texte
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('colors')}
              className={`flex-1 py-2.5 border-b-2 text-center transition-colors cursor-pointer ${
                activeTab === 'colors' ? 'border-indigo-500 text-white bg-slate-800/40' : 'border-transparent hover:text-slate-200'
              }`}
            >
              Theme-Farben
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4 overflow-y-auto space-y-4 max-h-[50vh] text-xs">
            {/* Tab 1: Übersicht & Vorschau */}
            {activeTab === 'preset' && (
              <div className="space-y-4">
                {/* Active Theme Card */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Aktives Theme</span>
                      <h4 className="text-sm font-extrabold text-white">{activeTheme.name}</h4>
                    </div>
                    <span className="rounded-lg bg-rose-600/90 text-white px-2 py-0.5 text-xs font-black">
                      {currentPreset.discountPct > 0 ? `−${currentPreset.discountPct} %` : 'Regulär'}
                    </span>
                  </div>

                  {/* Banner Simulation */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400">Banner-Vorschau</span>
                    <div className={`p-2.5 rounded-xl ${activeTheme.bannerBg} ${activeTheme.bannerText} border ${activeTheme.bannerBorder} text-xs flex items-center justify-between gap-2 shadow-xs`}>
                      <span className="font-bold truncate">{currentPreset.titleDe || 'Aktions-Ankündigung'}</span>
                      <span className="text-[10px] font-black rounded px-1.5 py-0.5 bg-black/20 shrink-0">
                        {currentPreset.badgeDe || '−' + currentPreset.discountPct + '%'}
                      </span>
                    </div>
                  </div>

                  {/* Feature Chips */}
                  <div className="flex flex-wrap gap-2 text-[11px] pt-1">
                    <span className="rounded-md bg-slate-800 px-2 py-1 text-slate-300">
                      Rundung: <strong className="text-white font-mono">{currentPreset.roundingStrategy}</strong>
                    </span>
                    <span className="rounded-md bg-slate-800 px-2 py-1 text-slate-300">
                      Statt-Preise: <strong className={currentPreset.showReferencePrice ? "text-emerald-400" : "text-slate-400"}>
                        {currentPreset.showReferencePrice ? 'Aktiv' : 'Aus'}
                      </strong>
                    </span>
                    {activeTheme.hasSnow && (
                      <span className="rounded-md bg-sky-950 text-sky-300 border border-sky-800 px-2 py-1 flex items-center gap-1 font-semibold">
                        ❄️ Schneefall aktiv
                      </span>
                    )}
                    {activeTheme.hasFireworks && (
                      <span className="rounded-md bg-amber-950 text-amber-300 border border-amber-800 px-2 py-1 flex items-center gap-1 font-semibold">
                        🎆 Feuerwerk aktiv
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-indigo-950/40 border border-indigo-900/50 p-3 text-[11px] text-indigo-300 leading-relaxed flex items-start gap-2">
                  <span>💡</span>
                  <div>
                    <strong>Tipp:</strong> Navigiere währenddessen frei durch den Shop (z. B. auf <em>/tariffs</em>, <em>/esim/turkey</em> oder den <em>Unlimited-Slider</em>). Alle Preise, Badges und Themes reagieren in Echtzeit!
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Rabatt & Texte */}
            {activeTab === 'discount' && (
              <div className="space-y-4">
                {/* Discount Percentage Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-bold text-slate-300">Rabatt in Prozent</label>
                    <span className="text-sm font-extrabold text-amber-400 font-mono">
                      {currentPreset.discountPct} %
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    step="5"
                    value={currentPreset.discountPct}
                    onChange={(e) => updateActivePreset({ discountPct: parseInt(e.target.value, 10) || 0 })}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                    <span>0% (Nur Theme)</span>
                    <span>15%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>90%</span>
                  </div>
                </div>

                {/* Rounding Strategy */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Rundungsstrategie</label>
                  <select
                    value={currentPreset.roundingStrategy}
                    onChange={(e) => updateActivePreset({ roundingStrategy: e.target.value as any })}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="x9_down">x9_down (Abrunden auf Cent .x9: Ersparnis ≥ %-Satz) [Empfohlen]</option>
                    <option value="existing_x9">existing_x9 (Aufrunden: Standard-Berechnung)</option>
                  </select>
                </div>

                {/* Reference Price */}
                <div className="rounded-xl bg-slate-900 p-3 border border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentPreset.showReferencePrice}
                      onChange={(e) => updateActivePreset({ showReferencePrice: e.target.checked })}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <div>
                      <span className="font-bold text-white block">„statt“-Preis durchgestrichen anzeigen</span>
                      <span className="text-[10px] text-slate-400">Zeigt den regulären Vor-Aktionspreis aus der Preishistorie</span>
                    </div>
                  </label>
                </div>

                {/* Localized Banner Texts */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-300 block">Banner-Titel (Deutsch)</label>
                  <input
                    type="text"
                    value={currentPreset.titleDe}
                    onChange={(e) => updateActivePreset({ titleDe: e.target.value })}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="z. B. Black Friday: 25 % Rabatt"
                  />
                  <label className="font-bold text-slate-300 block mt-2">Banner-Titel (Englisch)</label>
                  <input
                    type="text"
                    value={currentPreset.titleEn}
                    onChange={(e) => updateActivePreset({ titleEn: e.target.value })}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Black Friday: 25% off"
                  />
                </div>

                {/* Animation / Particles Selector */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Theme-Animation (Partikeleffekt)</label>
                  <select
                    value={currentPreset.animationType || (currentPreset.hasSnow ? 'snow' : currentPreset.hasFireworks ? 'fireworks' : 'none')}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      updateActivePreset({
                        animationType: val,
                        hasSnow: val === 'snow',
                        hasFireworks: val === 'fireworks',
                      });
                    }}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="none">Keine Animation</option>
                    <option value="snow">❄️ Schneeflocken (Weihnachten / Winter)</option>
                    <option value="fireworks">🎆 Feuerwerk & Funken (Silvester / Neujahr)</option>
                    <option value="confetti">🎉 Konfetti-Wirbel (Black Friday / Cyber Monday / Ostern)</option>
                    <option value="autumn_leaves">🍂 Herbstblätter (Black Week / Herbst)</option>
                    <option value="hearts">💖 Schwebende Herzen (Valentinstag / Partner-Deals)</option>
                    <option value="sun_sparkles">✨ Sonnenglanz & Glitzer (Sommerurlaub)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Tab 3: Theme-Farben */}
            {activeTab === 'colors' && (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-400">
                  Passe Header, Hero, Website-Hintergrund und Banner live an:
                </p>

                {/* Header Background */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Header Hintergrund</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={activeTheme.navBgColor?.startsWith('#') ? activeTheme.navBgColor : '#000000'}
                      onChange={(e) => updateThemeColors(currentPreset.themeId, { navBgColor: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={activeTheme.navBgColor || ''}
                      onChange={(e) => updateThemeColors(currentPreset.themeId, { navBgColor: e.target.value })}
                      className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                      placeholder="#000000"
                    />
                  </div>
                </div>

                {/* Page Background */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Website Hintergrund (Body)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={activeTheme.pageBgColor?.startsWith('#') ? activeTheme.pageBgColor : '#0a0a0a'}
                      onChange={(e) => updateThemeColors(currentPreset.themeId, { pageBgColor: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={activeTheme.pageBgColor || ''}
                      onChange={(e) => updateThemeColors(currentPreset.themeId, { pageBgColor: e.target.value })}
                      className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                      placeholder="#0a0a0a"
                    />
                  </div>
                </div>

                {/* Hero Gradient */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Hero Hintergrund CSS</label>
                  <input
                    type="text"
                    value={activeTheme.heroBgStyle || ''}
                    onChange={(e) => updateThemeColors(currentPreset.themeId, { heroBgStyle: e.target.value })}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                    placeholder="linear-gradient(180deg, #000000 0%, #171717 100%)"
                  />
                </div>

                {/* Logo & Highlight Color */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Logo & Highlight Farbe</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={activeTheme.logoColor?.startsWith('#') ? activeTheme.logoColor : '#fbbf24'}
                      onChange={(e) => updateThemeColors(currentPreset.themeId, { logoColor: e.target.value, heroHighlightColor: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={activeTheme.logoColor || ''}
                      onChange={(e) => updateThemeColors(currentPreset.themeId, { logoColor: e.target.value, heroHighlightColor: e.target.value })}
                      className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                      placeholder="#fbbf24"
                    />
                  </div>
                </div>

                {/* Accent Color (Icons, Steps, Links) */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Akzentfarbe (Icons, Schritte, Links)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={activeTheme.accentColor?.startsWith('#') ? activeTheme.accentColor : '#fcd34d'}
                      onChange={(e) => updateThemeColors(currentPreset.themeId, { accentColor: e.target.value, accentTextColor: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={activeTheme.accentColor || ''}
                      onChange={(e) => updateThemeColors(currentPreset.themeId, { accentColor: e.target.value, accentTextColor: e.target.value })}
                      className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                      placeholder="#fcd34d"
                    />
                  </div>
                </div>

                {/* Banner Background */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Banner Hintergrund</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={activeTheme.bannerBgColor?.startsWith('#') ? activeTheme.bannerBgColor : '#000000'}
                      onChange={(e) => updateThemeColors(currentPreset.themeId, { bannerBgColor: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={activeTheme.bannerBgColor || ''}
                      onChange={(e) => updateThemeColors(currentPreset.themeId, { bannerBgColor: e.target.value })}
                      className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                      placeholder="#000000"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={resetToDefaults}
                    className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 text-xs font-bold transition-colors cursor-pointer"
                  >
                    ↺ Farben auf Standard zurücksetzen
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveToAdmin}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-1.5 text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>💾</span>
                <span>Als Aktion speichern</span>
              </button>
              {saveStatus && <span className="text-xs font-semibold text-amber-300">{saveStatus}</span>}
            </div>

            <button
              type="button"
              onClick={() => toggleDemo(false)}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              Demo beenden
            </button>
          </div>
        </div>
      )}
    </>
  );
}
