'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

export function Footer() {
  const { t } = useTranslation();
  const year  = new Date().getFullYear();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const faqs = [
    { q: t('faq_q1' as any), a: t('faq_a1' as any) },
    { q: t('faq_q2' as any), a: t('faq_a2' as any) },
    { q: t('faq_q3' as any), a: t('faq_a3' as any) },
    { q: t('faq_q4' as any), a: t('faq_a4' as any) },
    { q: t('faq_q5' as any), a: t('faq_a5' as any) },
    { q: t('faq_q6' as any), a: t('faq_a6' as any) },
  ];

  return (
    <footer className="border-t border-slate-200 bg-slate-50/40 mt-10 md:mt-12">
      {/* FAQ Section */}
      <div className="mx-auto max-w-4xl px-4 py-10 md:py-12 border-b border-slate-200/80">
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-6 tracking-tight">
          {t('faq_title' as any) || 'Häufig gestellte Fragen (FAQ)'}
        </h2>
        
        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div 
                key={idx} 
                className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all duration-300 hover:border-slate-300"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="flex w-full items-center justify-between px-6 py-4.5 text-left font-semibold text-slate-800 hover:text-brand-650 transition-colors duration-200 cursor-pointer outline-none"
                >
                  <span className="text-sm md:text-base pr-4 leading-snug">{faq.q}</span>
                  <span className={`text-slate-400 shrink-0 transform transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-600' : ''}`}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>
                
                <div 
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    isOpen ? 'max-h-[250px] border-t border-slate-100' : 'max-h-0'
                  }`}
                >
                  <div className="px-6 py-4.5 text-sm text-slate-500 leading-relaxed bg-slate-50/20">
                    {faq.a}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-2 text-lg font-bold">
                <img src="/logo.png" alt="PureSim Logo" className="h-10 w-10 object-contain" />
                <span className="text-2xl tracking-tight">
                  <span className="text-[#1d4ed8]">Pur</span>
                  <span className="text-[#0ea5e9]">eSim</span>
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                {t('hero_badge')}
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-800 mb-3">{t('footer_nav_title')}</p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link href="/tariffs"   className="hover:text-brand-700 transition-colors">{t('footer_browse')}</Link></li>
                <li><Link href="/topup"     className="hover:text-brand-700 transition-colors">{t('footer_topup')}</Link></li>
                <li><Link href="/dashboard" className="hover:text-brand-700 transition-colors">{t('footer_dashboard')}</Link></li>
                <li><Link href="/blog"      className="hover:text-brand-700 transition-colors">{t('footer_blog' as any) || 'Blog'}</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-slate-800 mb-3">{t('footer_legal_title')}</p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link href="/agb"         className="hover:text-brand-700 transition-colors">{t('footer_terms')}</Link></li>
                <li><Link href="/datenschutz" className="hover:text-brand-700 transition-colors">{t('footer_privacy')}</Link></li>
                <li><Link href="/refund-policy" className="hover:text-brand-700 transition-colors">{t('footer_refund')}</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
            {t('footer_copy', { year })}
          </div>
        </div>
      </div>
    </footer>
  );
}
