import type { Metadata } from 'next';
import { ThemeStudioClient } from './ThemeStudioClient';

export const metadata: Metadata = {
  title: 'Theme Studio & Live Demo | PureSim',
  description: 'Zentrales Studio zum Betrachten, Testen und Bearbeiten der saisonalen Themes und Aktionen.',
  robots: { index: false, follow: false },
};

export default function ThemeStudioPage() {
  return <ThemeStudioClient />;
}
