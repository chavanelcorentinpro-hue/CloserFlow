import type { Invoice, InventoryItem, Mission, Quote } from '../types/domain';
import { totals } from './documents';

export type InsightSeverity = 'critical' | 'warning' | 'info' | 'success';
export interface BusinessInsight {
  id: string;
  severity: InsightSeverity;
  title: string;
  description: string;
  actionLabel: string;
  href: string;
  score: number;
}

const DAY = 86_400_000;

export function remainingInvoice(invoice: Invoice): number {
  const total = totals(invoice.lines, invoice.discount_percent, invoice.vat_rate).ttc;
  const paid = (invoice.payments ?? []).reduce((sum, payment) => sum + payment.amount, 0);
  return Math.max(0, total - paid);
}

export function buildBusinessInsights(input: {
  missions: Mission[];
  quotes: Quote[];
  invoices: Invoice[];
  inventory: InventoryItem[];
}): BusinessInsight[] {
  const { missions, quotes, invoices, inventory } = input;
  const now = Date.now();
  const insights: BusinessInsight[] = [];

  const overdue = invoices.filter((invoice) => invoice.status === 'overdue' || (!!invoice.due_date && new Date(invoice.due_date).getTime() < now && remainingInvoice(invoice) > 0));
  const overdueAmount = overdue.reduce((sum, invoice) => sum + remainingInvoice(invoice), 0);
  if (overdue.length) insights.push({
    id: 'overdue-invoices', severity: 'critical', score: 100,
    title: `${overdue.length} facture${overdue.length > 1 ? 's' : ''} à relancer`,
    description: `${overdueAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} restent à encaisser.`,
    actionLabel: 'Préparer les relances', href: '/follow-ups'
  });

  const staleQuotes = quotes.filter((quote) => ['draft', 'sent'].includes(quote.status) && now - new Date(quote.created_at).getTime() > 7 * DAY);
  if (staleQuotes.length) insights.push({
    id: 'stale-quotes', severity: 'warning', score: 85,
    title: `${staleQuotes.length} devis sans réponse depuis 7 jours`,
    description: 'Une relance rapide peut augmenter le taux de transformation.',
    actionLabel: 'Préparer les relances', href: '/follow-ups'
  });

  const lowStock = inventory.filter((item) => item.quantity <= item.minimum_quantity);
  if (lowStock.length) insights.push({
    id: 'low-stock', severity: 'warning', score: 75,
    title: `${lowStock.length} article${lowStock.length > 1 ? 's' : ''} sous le seuil minimum`,
    description: 'Préparez les achats avant les prochaines interventions.',
    actionLabel: 'Ouvrir le stock', href: '/inventory'
  });

  const unplannedAccepted = missions.filter((mission) => mission.status === 'accepted' && !mission.scheduled_start);
  if (unplannedAccepted.length) insights.push({
    id: 'unplanned', severity: 'info', score: 65,
    title: `${unplannedAccepted.length} mission${unplannedAccepted.length > 1 ? 's' : ''} acceptée${unplannedAccepted.length > 1 ? 's' : ''} non planifiée${unplannedAccepted.length > 1 ? 's' : ''}`,
    description: 'Placez-les dans le planning pour sécuriser les délais annoncés.',
    actionLabel: 'Planifier', href: '/planning'
  });

  const completedNotInvoiced = missions.filter((mission) => mission.status === 'completed' && !invoices.some((invoice) => invoice.mission_id === mission.id));
  if (completedNotInvoiced.length) insights.push({
    id: 'uninvoiced', severity: 'critical', score: 95,
    title: `${completedNotInvoiced.length} chantier${completedNotInvoiced.length > 1 ? 's' : ''} terminé${completedNotInvoiced.length > 1 ? 's' : ''} non facturé${completedNotInvoiced.length > 1 ? 's' : ''}`,
    description: 'Transformez le travail terminé en chiffre d’affaires sans attendre.',
    actionLabel: 'Créer les factures', href: '/invoices'
  });

  if (!insights.length) insights.push({
    id: 'all-good', severity: 'success', score: 10,
    title: 'Aucune urgence détectée',
    description: 'Les données locales ne signalent aucun blocage important.',
    actionLabel: 'Voir le planning', href: '/planning'
  });

  return insights.sort((a, b) => b.score - a.score);
}
