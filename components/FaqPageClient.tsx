'use client';

import React, { useState } from 'react';

interface FaqItem {
  q: string;
  a: string;
}

interface FaqPageClientProps {
  title: string;
  subtitle?: string;
  faqs: FaqItem[];
}

export function FaqPageClient({ title, subtitle, faqs }: FaqPageClientProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // First one open by default

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 md:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 md:mb-14">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-3 text-base md:text-lg text-slate-600 max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all duration-300 hover:border-slate-300"
              >
                <button
                  type="button"
                  id={`faq-btn-${idx}`}
                  aria-controls={`faq-ans-${idx}`}
                  onClick={() => toggle(idx)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between px-6 py-5 min-h-[52px] text-left font-semibold text-slate-900 hover:text-brand-650 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                >
                  <span className="text-base md:text-lg pr-4 leading-snug">{faq.q}</span>
                  <span
                    className={`text-slate-400 shrink-0 transform transition-transform duration-300 ${
                      isOpen ? 'rotate-180 text-brand-600' : ''
                    }`}
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>

                <div
                  id={`faq-ans-${idx}`}
                  role="region"
                  aria-labelledby={`faq-btn-${idx}`}
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    isOpen ? 'max-h-[500px] border-t border-slate-100' : 'max-h-0'
                  }`}
                >
                  <div className="px-6 py-5 text-sm md:text-base text-slate-600 leading-relaxed bg-slate-50/30">
                    {faq.a}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
