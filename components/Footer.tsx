'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { useTicket } from '@/components/TicketContext';

export function Footer() {
  const { t, locale } = useTranslation();
  const prefix = locale === 'en' ? '/en' : '';
  const { openTicketModal } = useTicket();
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
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between px-6 py-5 min-h-[52px] text-left font-semibold text-slate-800 hover:text-brand-650 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
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
                  <div className="px-6 py-5 text-sm text-slate-500 leading-relaxed bg-slate-50/20">
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
          <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 text-lg font-bold">
                <img src="/logo.png" alt="PureSim Logo" className="h-10 w-10 object-contain" />
                <span className="text-2xl tracking-tight font-extrabold text-[#1d4ed8]">
                  PureSim
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                {t('hero_badge')}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-8 md:col-span-2">
              <div>
                <p className="font-semibold text-slate-800 mb-3">{t('footer_nav_title')}</p>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li><Link href={`${prefix}/tariffs`}   className="hover:text-brand-700 transition-colors">{t('footer_browse')}</Link></li>
                  <li><Link href={`${prefix}/topup`}     className="hover:text-brand-700 transition-colors">{t('footer_topup')}</Link></li>
                  <li><Link href={`${prefix}/dashboard`} className="hover:text-brand-700 transition-colors">{t('footer_dashboard')}</Link></li>
                  <li><Link href={`${prefix}/blog`}      className="hover:text-brand-700 transition-colors">{t('footer_blog' as any) || 'Blog'}</Link></li>
                  <li><Link href={`${prefix}/ai`}        className="hover:text-brand-700 transition-colors">{t('footer_ai')}</Link></li>
                  <li><button onClick={() => openTicketModal()} className="hover:text-brand-700 transition-colors text-left">{t('footer_open_ticket')}</button></li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-800 mb-3">{t('footer_legal_title')}</p>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li><Link href={`${prefix}/agb`}         className="hover:text-brand-700 transition-colors">{t('footer_terms')}</Link></li>
                  <li><Link href={`${prefix}/datenschutz`} className="hover:text-brand-700 transition-colors">{t('footer_privacy')}</Link></li>
                  <li><Link href={`${prefix}/refund-policy`} className="hover:text-brand-700 transition-colors">{t('footer_refund')}</Link></li>
                  <li>
                    <a
                      href="https://t.me/autoacts"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-brand-750 transition-colors"
                    >
                      <svg className="h-4 w-4 shrink-0 text-[#24A1DE]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                      </svg>
                      <span>Kontakt über Telegram</span>
                    </a>
                  </li>
                </ul>
              </div>
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
