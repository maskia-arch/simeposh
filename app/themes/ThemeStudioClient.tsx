'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useThemeDemo, THEME_PRESETS, ThemePreset } from '@/lib/theme-demo-context';
import { THEMES, ThemeConfig } from '@/lib/themes';

export function ThemeStudioClient() {
  const {
    activePresetId,
    selectPreset,
    updateActivePreset,
    updateThemeColors,
    customThemes,
    presets,
    createNewPreset,
  } = useThemeDemo();

  const [editingPreset, setEditingPreset] = useState<ThemePreset | null>(null);
  const [editingThemeColors, setEditingThemeColors] = useState<ThemeConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'discount' | 'colors'>('discount');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleEditClick = (preset: ThemePreset) => {
    setEditingPreset({ ...preset });
    const currentTheme = customThemes[preset.themeId] || THEMES[preset.themeId] || THEMES.standard;
    setEditingThemeColors({ ...currentTheme });
    setActiveTab('discount');
  };

  const handleCreateNewTheme = () => {
    const defaultName = `Eigenes Theme ${presets.length + 1}`;
    const customName = typeof window !== 'undefined' ? window.prompt('Name des neuen Themes:', defaultName) : defaultName;
    if (customName === null) return;
    const newPresetId = createNewPreset(customName.trim() || defaultName);
    const newPreset = presets.find((p) => p.id === newPresetId);
    if (newPreset) {
      handleEditClick(newPreset);
    }
  };

  const handleColorChange = (key: keyof ThemeConfig, value: any) => {
    if (!editingThemeColors || !editingPreset) return;
    const updated = { ...editingThemeColors, [key]: value };
    setEditingThemeColors(updated);
    updateThemeColors(editingPreset.themeId, { [key]: value });
  };

  const handleSave = async () => {
    if (!editingPreset) return;
    setSaveStatus('Speichere Vorlage...');

    updateActivePreset(editingPreset);
    if (editingThemeColors) {
      updateThemeColors(editingPreset.themeId, editingThemeColors);
    }

    try {
      const res = await fetch('/api/admin/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internal_name: editingPreset.name,
          discount_percent: editingPreset.discountPct,
          rounding_strategy: editingPreset.roundingStrategy,
          show_reference_price: editingPreset.showReferencePrice,
          scope: editingPreset.scope || (editingPreset.appliesToTopup ? 'all' : 'new_esim'),
          applies_to_topup: Boolean(editingPreset.appliesToTopup),
          theme_id: editingPreset.themeId,
          titles: { de: editingPreset.titleDe, en: editingPreset.titleEn },
          texts: { de: 'Im Theme Studio konfiguriert.', en: 'Configured in Theme Studio.' },
          badge_texts: { de: editingPreset.badgeDe, en: editingPreset.badgeEn },
          starts_at: new Date().toISOString(),
          ends_at: new Date(Date.now() + 86400000 * 7).toISOString(),
          status: 'draft',
          priority: editingPreset.discountPct >= 20 ? 20 : 10,
          theme_config: editingThemeColors || undefined,
        }),
      });

      if (res.ok) {
        setSaveStatus('✅ Erfolgreich in der Datenbank gespeichert & im Admin verfügbar!');
        setTimeout(() => {
          setSaveStatus(null);
          setEditingPreset(null);
          setEditingThemeColors(null);
        }, 1800);
      } else {
        const data = await res.json();
        setSaveStatus(`❌ ${data.error || 'Fehler beim Speichern'}`);
      }
    } catch (err: any) {
      setSaveStatus(`❌ ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🎨</span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                PureSim Theme Studio & Demo
              </h1>
              <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-mono font-bold">
                Live Testumgebung
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-2xl">
              Passe alle Farben, Header, Backgrounds, Banner und Rabatte flexibel an. Gespeicherte Vorlagen stehen sofort im Admin Dashboard bereit.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCreateNewTheme}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-black shadow-lg shadow-emerald-700/30 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>+</span>
              <span>Neues Theme erstellen</span>
            </button>
            <Link
              href="/"
              className="rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-bold transition-colors"
            >
              ← Zur Startseite
            </Link>
            <Link
              href="/tariffs"
              className="rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-bold transition-colors"
            >
              Zur Tarifliste
            </Link>
          </div>
        </div>

        {/* Presets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {presets.map((preset) => {
            const isActive = activePresetId === preset.id;
            const theme = customThemes[preset.themeId] || THEMES[preset.themeId] || THEMES.standard;

            return (
              <div
                key={preset.id}
                className={`rounded-3xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                  isActive
                    ? 'border-emerald-500/80 bg-slate-900/90 shadow-2xl shadow-emerald-950/40 ring-2 ring-emerald-500/50'
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                }`}
              >
                {/* Banner Mini-Preview */}
                <div
                  style={{
                    background: theme.bannerBgColor || undefined,
                    color: theme.bannerTextColor || undefined,
                    borderColor: theme.bannerBorderColor || undefined,
                  }}
                  className={`p-3 text-center text-xs font-bold border-b ${theme.bannerBg} ${theme.bannerText} ${theme.bannerBorder}`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span
                      style={{
                        backgroundColor: theme.badgeBgColor || undefined,
                        color: theme.badgeTextColor || undefined,
                      }}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${theme.badgeBg}`}
                    >
                      {preset.badgeDe || 'Aktion'}
                    </span>
                    <span className="truncate">{preset.titleDe || 'Standard-Ansicht'}</span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 space-y-4 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                        <span>{preset.name}</span>
                        {isActive && (
                          <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.2 text-[10px] font-bold">
                            Aktiv
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Theme: <span className="font-mono text-slate-300">{preset.themeId}</span>
                      </p>
                    </div>

                    {/* Color Swatch Dots */}
                    <div className="flex items-center gap-1">
                      <span
                        title="Header Hintergrund"
                        className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                        style={{ backgroundColor: theme.navBgColor || '#000000' }}
                      />
                      <span
                        title="Hero Highlight"
                        className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                        style={{ backgroundColor: theme.logoColor || '#1d4ed8' }}
                      />
                      <span
                        title="Seiten Hintergrund"
                        className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                        style={{ backgroundColor: theme.pageBgColor || '#ffffff' }}
                      />
                    </div>
                  </div>

                  {/* Calculated Sample Price */}
                  <div className="rounded-2xl bg-slate-950 p-3 border border-slate-800/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Beispiel-Tarif (9,99 € Normalpreis)
                    </span>
                    <div className="flex items-baseline justify-between">
                      <div>
                        {preset.showReferencePrice && preset.discountPct > 0 && (
                          <span className="text-[11px] text-slate-500 line-through font-medium block">
                            statt 9,99 €
                          </span>
                        )}
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-white">
                            {preset.discountPct === 25 ? '7,49 €' : preset.discountPct === 20 ? '7,99 €' : preset.discountPct === 15 ? '8,49 €' : preset.discountPct === 10 ? '8,99 €' : '9,99 €'}
                          </span>
                          {preset.discountPct > 0 && (
                            <span className="rounded-md bg-rose-600 px-1.5 py-0.5 text-xs font-black text-white">
                              −{preset.discountPct} %
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded-md">
                        {preset.roundingStrategy}
                      </span>
                    </div>
                  </div>

                  {/* Features & Badges */}
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    {preset.animationType && preset.animationType !== 'none' ? (
                      <span className="rounded-lg bg-indigo-950/80 text-indigo-300 border border-indigo-800 px-2 py-0.5 font-semibold flex items-center gap-1">
                        <span>✨</span>
                        <span>
                          {preset.animationType === 'snow'
                            ? 'Schneefall'
                            : preset.animationType === 'fireworks'
                            ? 'Feuerwerk'
                            : preset.animationType === 'confetti'
                            ? 'Konfetti'
                            : preset.animationType === 'autumn_leaves'
                            ? 'Herbstlaub'
                            : preset.animationType === 'hearts'
                            ? 'Herzen'
                            : preset.animationType === 'sun_sparkles'
                            ? 'Sonnenglanz'
                            : preset.animationType}
                        </span>
                      </span>
                    ) : null}
                    {preset.showReferencePrice && (
                      <span className="rounded-lg bg-slate-800 text-emerald-400 px-2 py-0.5 font-semibold">
                        ✓ Statt-Preise aktiv
                      </span>
                    )}
                    <span className={`rounded-lg px-2 py-0.5 font-semibold ${
                      preset.appliesToTopup
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950/80 text-amber-300 border border-amber-800'
                    }`}>
                      {preset.appliesToTopup ? '✓ eSIM & Top-up' : '✕ Keine Top-ups'}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => selectPreset(preset.id)}
                      className={`flex-1 rounded-xl py-2.5 px-3 text-xs font-extrabold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                    >
                      {isActive ? '✓ Aktuell aktiv' : 'Live aktivieren'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditClick(preset)}
                      className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2.5 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Anpassen
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Create New Theme Card */}
          <div
            onClick={handleCreateNewTheme}
            className="rounded-3xl border-2 border-dashed border-emerald-500/40 bg-emerald-950/20 hover:bg-emerald-950/40 hover:border-emerald-500/80 transition-all duration-200 p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[340px] group"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-3xl font-black mb-4 group-hover:scale-110 group-hover:bg-emerald-500/30 transition-all shadow-lg shadow-emerald-950/50">
              +
            </div>
            <h3 className="text-lg font-black text-white mb-2">Komplett neues Theme erstellen</h3>
            <p className="text-xs text-slate-400 max-w-xs mb-5">
              Definiere deine eigenen Wunschfarben für Header, Banner, Hero und Hintergrund. Sofort live testbar und im Admin Dashboard speicherbar.
            </p>
            <span className="rounded-xl bg-emerald-600 group-hover:bg-emerald-500 text-white font-bold px-4 py-2.5 text-xs shadow-lg shadow-emerald-700/30 transition-all">
              + Theme jetzt anlegen
            </span>
          </div>
        </div>

        {/* Comprehensive Edit & Customize Modal */}
        {editingPreset && editingThemeColors && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150 my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span>🎨</span> Theme & Vorlage anpassen: {editingPreset.name}
                </h3>
                <button
                  type="button"
                  onClick={() => { setEditingPreset(null); setEditingThemeColors(null); }}
                  className="text-slate-400 hover:text-white font-bold p-1 text-lg"
                >
                  ✕
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-800 gap-4 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('discount')}
                  className={`pb-2 border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'discount'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  1. Rabatt & Texte
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('colors')}
                  className={`pb-2 border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'colors'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  2. Farben & Backgrounds (Header, Hero, Body)
                </button>
              </div>

              {/* Tab 1: Rabatt & Texte */}
              {activeTab === 'discount' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-300 block mb-1">Aktions-Rabatt (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="90"
                      value={editingPreset.discountPct}
                      onChange={(e) => setEditingPreset({ ...editingPreset, discountPct: parseInt(e.target.value, 10) || 0 })}
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 p-2.5 text-white text-sm font-bold text-amber-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-300 block mb-1">Rundungsstrategie</label>
                    <select
                      value={editingPreset.roundingStrategy}
                      onChange={(e) => setEditingPreset({ ...editingPreset, roundingStrategy: e.target.value as any })}
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 p-2.5 text-white"
                    >
                      <option value="x9_down">x9_down (Abrunden auf .x9 – Rabatt ≥ beworbener Prozentsatz)</option>
                      <option value="existing_x9">existing_x9 (Aufrunden auf .x9)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-300 block mb-1">Banner-Titel (Deutsch)</label>
                    <input
                      type="text"
                      value={editingPreset.titleDe}
                      onChange={(e) => setEditingPreset({ ...editingPreset, titleDe: e.target.value })}
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 p-2.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-300 block mb-1">Banner-Titel (Englisch)</label>
                    <input
                      type="text"
                      value={editingPreset.titleEn}
                      onChange={(e) => setEditingPreset({ ...editingPreset, titleEn: e.target.value })}
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 p-2.5 text-white"
                    />
                  </div>

                  <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingPreset.showReferencePrice}
                        onChange={(e) => setEditingPreset({ ...editingPreset, showReferencePrice: e.target.checked })}
                        className="rounded text-indigo-600 h-4 w-4"
                      />
                      <span className="font-bold text-white">„statt“-Preis durchgestrichen anzeigen (§ 11 PAngV)</span>
                    </label>
                  </div>

                  <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editingPreset.appliesToTopup)}
                        onChange={(e) => setEditingPreset({
                          ...editingPreset,
                          appliesToTopup: e.target.checked,
                          scope: e.target.checked ? 'all' : 'new_esim',
                        })}
                        className="rounded text-indigo-600 h-4 w-4"
                      />
                      <div>
                        <span className="font-bold text-white block">Rabatt auch auf eSIM-Aufladungen (Top-ups) anwenden</span>
                        <span className="text-[10px] text-slate-400">
                          {editingPreset.appliesToTopup
                            ? 'Aktionsrabatt gilt für Neukäufe UND bestehende eSIM-Aufladungen'
                            : 'Aktionsrabatt gilt ausschließlich für neue eSIMs (keine Aufladungen)'}
                        </span>
                      </div>
                    </label>
                  </div>

                  <div>
                    <label className="font-bold text-slate-300 block mb-1">Theme-Animation (Partikeleffekt)</label>
                    <select
                      value={editingPreset.animationType || (editingPreset.hasSnow ? 'snow' : editingPreset.hasFireworks ? 'fireworks' : 'none')}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setEditingPreset({
                          ...editingPreset,
                          animationType: val,
                          hasSnow: val === 'snow',
                          hasFireworks: val === 'fireworks',
                        });
                      }}
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 p-2.5 text-white text-xs"
                    >
                      <option value="none">Keine Animation</option>
                      <option value="snow">❄️ Schneeflocken (Weihnachten / Winter)</option>
                      <option value="fireworks">🎆 Feuerwerk & Funken (Silvester / Neujahr)</option>
                      <option value="confetti">🎉 Konfetti-Wirbel (Black Friday / Cyber Monday / Ostern)</option>
                      <option value="autumn_leaves">🍂 Herbstblätter (Black Week / Herbst)</option>
                      <option value="hearts">💖 Schwebende Herzen (Valentinstag)</option>
                      <option value="sun_sparkles">✨ Sonnenglanz & Glitzer (Sommerurlaub)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Tab 2: Farben & Backgrounds */}
              {activeTab === 'colors' && (
                <div className="space-y-4 text-xs">
                  <p className="text-slate-400 text-[11px]">
                    Hier kannst du jede einzelne Farbe für Navigation, Hero-Bereich, Website-Hintergrund und Buttons manuell festlegen. Änderungen werden sofort live simuliert.
                  </p>

                  {/* Header / Navbar */}
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <span className="font-extrabold text-indigo-300 block text-xs uppercase tracking-wider">
                      Header / Navigation
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-400 block mb-1">Header Hintergrund</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={editingThemeColors.navBgColor?.startsWith('#') ? editingThemeColors.navBgColor : '#000000'}
                            onChange={(e) => handleColorChange('navBgColor', e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                          />
                          <input
                            type="text"
                            value={editingThemeColors.navBgColor || ''}
                            onChange={(e) => handleColorChange('navBgColor', e.target.value)}
                            className="flex-1 rounded-lg bg-slate-900 border border-slate-700 p-1.5 text-white font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-1">Header Text / Links</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={editingThemeColors.navTextColor?.startsWith('#') ? editingThemeColors.navTextColor : '#f4f4f5'}
                            onChange={(e) => handleColorChange('navTextColor', e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                          />
                          <input
                            type="text"
                            value={editingThemeColors.navTextColor || ''}
                            onChange={(e) => handleColorChange('navTextColor', e.target.value)}
                            className="flex-1 rounded-lg bg-slate-900 border border-slate-700 p-1.5 text-white font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-1">Logo-Farbe (PureSim Text)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={editingThemeColors.logoColor?.startsWith('#') ? editingThemeColors.logoColor : '#fbbf24'}
                            onChange={(e) => handleColorChange('logoColor', e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                          />
                          <input
                            type="text"
                            value={editingThemeColors.logoColor || ''}
                            onChange={(e) => handleColorChange('logoColor', e.target.value)}
                            className="flex-1 rounded-lg bg-slate-900 border border-slate-700 p-1.5 text-white font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-1">Header Rahmenfarbe</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={editingThemeColors.navBorderColor?.startsWith('#') ? editingThemeColors.navBorderColor : '#262626'}
                            onChange={(e) => handleColorChange('navBorderColor', e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                          />
                          <input
                            type="text"
                            value={editingThemeColors.navBorderColor || ''}
                            onChange={(e) => handleColorChange('navBorderColor', e.target.value)}
                            className="flex-1 rounded-lg bg-slate-900 border border-slate-700 p-1.5 text-white font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hero Section & Background */}
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <span className="font-extrabold text-indigo-300 block text-xs uppercase tracking-wider">
                      Hero-Bereich & Website-Hintergrund
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-slate-400 block mb-1">Hero Hintergrund CSS (Farbverlauf / Gradient)</label>
                        <input
                          type="text"
                          value={editingThemeColors.heroBgStyle || ''}
                          onChange={(e) => handleColorChange('heroBgStyle', e.target.value)}
                          className="w-full rounded-lg bg-slate-900 border border-slate-700 p-1.5 text-white font-mono text-xs"
                          placeholder="linear-gradient(180deg, #000000 0%, #171717 100%)"
                        />
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-1">Website Hintergrund (Body)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={editingThemeColors.pageBgColor?.startsWith('#') ? editingThemeColors.pageBgColor : '#0a0a0a'}
                            onChange={(e) => handleColorChange('pageBgColor', e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                          />
                          <input
                            type="text"
                            value={editingThemeColors.pageBgColor || ''}
                            onChange={(e) => handleColorChange('pageBgColor', e.target.value)}
                            className="flex-1 rounded-lg bg-slate-900 border border-slate-700 p-1.5 text-white font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-1">Hero Text-Highlight (Farbe)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={editingThemeColors.heroHighlightColor?.startsWith('#') ? editingThemeColors.heroHighlightColor : '#fbbf24'}
                            onChange={(e) => handleColorChange('heroHighlightColor', e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                          />
                          <input
                            type="text"
                            value={editingThemeColors.heroHighlightColor || ''}
                            onChange={(e) => handleColorChange('heroHighlightColor', e.target.value)}
                            className="flex-1 rounded-lg bg-slate-900 border border-slate-700 p-1.5 text-white font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Buttons & Banner */}
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <span className="font-extrabold text-indigo-300 block text-xs uppercase tracking-wider">
                      Buttons & Aktionsbanner
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-400 block mb-1">Primärbutton Hintergrund</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={editingThemeColors.btnPrimaryBg?.startsWith('#') ? editingThemeColors.btnPrimaryBg : '#fbbf24'}
                            onChange={(e) => handleColorChange('btnPrimaryBg', e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                          />
                          <input
                            type="text"
                            value={editingThemeColors.btnPrimaryBg || ''}
                            onChange={(e) => handleColorChange('btnPrimaryBg', e.target.value)}
                            className="flex-1 rounded-lg bg-slate-900 border border-slate-700 p-1.5 text-white font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-1">Primärbutton Schriftfarbe</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={editingThemeColors.btnPrimaryText?.startsWith('#') ? editingThemeColors.btnPrimaryText : '#000000'}
                            onChange={(e) => handleColorChange('btnPrimaryText', e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                          />
                          <input
                            type="text"
                            value={editingThemeColors.btnPrimaryText || ''}
                            onChange={(e) => handleColorChange('btnPrimaryText', e.target.value)}
                            className="flex-1 rounded-lg bg-slate-900 border border-slate-700 p-1.5 text-white font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-1">Banner Hintergrund</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={editingThemeColors.bannerBgColor?.startsWith('#') ? editingThemeColors.bannerBgColor : '#000000'}
                            onChange={(e) => handleColorChange('bannerBgColor', e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                          />
                          <input
                            type="text"
                            value={editingThemeColors.bannerBgColor || ''}
                            onChange={(e) => handleColorChange('bannerBgColor', e.target.value)}
                            className="flex-1 rounded-lg bg-slate-900 border border-slate-700 p-1.5 text-white font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-1">Banner Textfarbe</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={editingThemeColors.bannerTextColor?.startsWith('#') ? editingThemeColors.bannerTextColor : '#fbbf24'}
                            onChange={(e) => handleColorChange('bannerTextColor', e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                          />
                          <input
                            type="text"
                            value={editingThemeColors.bannerTextColor || ''}
                            onChange={(e) => handleColorChange('bannerTextColor', e.target.value)}
                            className="flex-1 rounded-lg bg-slate-900 border border-slate-700 p-1.5 text-white font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-1">Akzentfarbe (Icons, Schritte, Links)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={editingThemeColors.accentColor?.startsWith('#') ? editingThemeColors.accentColor : '#fbbf24'}
                            onChange={(e) => handleColorChange('accentColor', e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                          />
                          <input
                            type="text"
                            value={editingThemeColors.accentColor || ''}
                            onChange={(e) => handleColorChange('accentColor', e.target.value)}
                            className="flex-1 rounded-lg bg-slate-900 border border-slate-700 p-1.5 text-white font-mono text-xs"
                            placeholder="#fbbf24"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {saveStatus && (
                <div className="text-xs font-bold text-center text-amber-400 py-1 bg-amber-950/40 rounded-xl border border-amber-800">
                  {saveStatus}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setEditingPreset(null); setEditingThemeColors(null); }}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 text-xs shadow-md transition-all cursor-pointer"
                >
                  Speichern & Im Admin bereitstellen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
