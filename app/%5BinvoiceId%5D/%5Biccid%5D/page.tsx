import { EsimOverviewView } from '@/components/EsimOverviewView';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ invoiceId: string; iccid: string }> | { invoiceId: string; iccid: string };
}

export default async function DirectOverviewPage({ params }: PageProps) {
  return <EsimOverviewView params={params} />;
}
