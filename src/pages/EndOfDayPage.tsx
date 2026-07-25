import { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Copy, Moon, ReceiptText, TriangleAlert, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { money, totals } from '../lib/documents';
import { remainingInvoice } from '../lib/insights';

const dayKey = () => new Date().toISOString().slice(0, 10);

export function EndOfDayPage() {
  const { missions, quotes, invoices, inventory } = useAppData();
  const storageKey = `closerflow.endofday.${dayKey()}`;
  const [checks, setChecks] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { return {}; }
  });
  const [copied, setCopied] = useState(false);

  const today = dayKey();
  const todayMissions = missions.filter((mission) => {
    const source = mission.finished_at || mission.started_at || mission.scheduled_start;
    return source?.slice(0, 10) === today;
  });
  const completedToday = todayMissions.filter((mission) => ['completed', 'invoiced', 'paid'].includes(mission.status));
  const inProgress = missions.filter((mission) => mission.status === 'in_progress');
  const completedNotInvoiced = missions.filter((mission) => mission.status === 'completed' && !invoices.some((invoice) => invoice.mission_id === mission.id));
  const oldQuotes = quotes.filter((quote) => quote.status === 'sent' && Date.now() - new Date(quote.created_at).getTime() > 7 * 86_400_000);
  const overdue = invoices.filter((invoice) => remainingInvoice(invoice) > 0 && (invoice.status === 'overdue' || (!!invoice.due_date && new Date(invoice.due_date).getTime() < Date.now())));
  const lowStock = inventory.filter((item) => item.quantity <= item.minimum_quantity);
  const billedToday = invoices.filter((invoice) => invoice.created_at.slice(0, 10) === today).reduce((sum, invoice) => sum + totals(invoice.lines, invoice.discount_percent, invoice.vat_rate).ttc, 0);

  const tasks = useMemo(() => [
    { id: 'missions', label: 'Clôturer les interventions terminées', detail: `${inProgress.length} intervention(s) encore en cours`, href: '/missions', warning: inProgress.length > 0 },
    { id: 'invoices', label: 'Facturer les chantiers terminés', detail: `${completedNotInvoiced.length} chantier(s) à facturer`, href: '/missions', warning: completedNotInvoiced.length > 0 },
    { id: 'quotes', label: 'Préparer les relances de devis', detail: `${oldQuotes.length} devis sans réponse depuis 7 jours`, href: '/quotes', warning: oldQuotes.length > 0 },
    { id: 'payments', label: 'Contrôler les encaissements', detail: `${overdue.length} facture(s) en retard`, href: '/invoices', warning: overdue.length > 0 },
    { id: 'stock', label: 'Vérifier le matériel de demain', detail: `${lowStock.length} article(s) au seuil minimum`, href: '/inventory', warning: lowStock.length > 0 },
  ], [inProgress.length, completedNotInvoiced.length, oldQuotes.length, overdue.length, lowStock.length]);

  const toggle = (id: string) => {
    const next = { ...checks, [id]: !checks[id] };
    setChecks(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };
  const done = tasks.filter((task) => checks[task.id]).length;
  const summary = [
    `Bilan CloserFlow — ${new Date().toLocaleDateString('fr-FR')}`,
    `${completedToday.length} intervention(s) terminée(s) aujourd’hui`,
    `${money(billedToday)} facturés aujourd’hui`,
    `${completedNotInvoiced.length} chantier(s) terminé(s) non facturé(s)`,
    `${overdue.length} facture(s) en retard`,
    `${oldQuotes.length} devis à relancer`,
    `${lowStock.length} article(s) à réapprovisionner`,
  ].join('\n');

  const copySummary = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return <>
    <section className="command-hero endofday-hero">
      <div><p className="eyebrow">ASSISTANT DE FIN DE JOURNÉE</p><h1>Fermer la journée sans oubli</h1><p>Un contrôle rapide avant de quitter le chantier ou le bureau.</p></div>
      <div className="command-score"><Moon/><span>Progression</span><strong>{done}/{tasks.length}</strong></div>
    </section>

    <section className="endofday-stats">
      <article><Wrench/><strong>{completedToday.length}</strong><span>interventions terminées</span></article>
      <article><ReceiptText/><strong>{money(billedToday)}</strong><span>facturés aujourd’hui</span></article>
      <article className={overdue.length ? 'warning' : ''}><TriangleAlert/><strong>{overdue.length}</strong><span>factures en retard</span></article>
    </section>

    <div className="section-heading"><div><p className="eyebrow">CHECK-LIST</p><h2>Les 5 contrôles essentiels</h2></div><ClipboardCheck/></div>
    <section className="closing-list">
      {tasks.map((task) => <article key={task.id} className={`${checks[task.id] ? 'done' : ''} ${task.warning ? 'needs-attention' : ''}`}>
        <button className="closing-check" onClick={() => toggle(task.id)} aria-label={checks[task.id] ? 'Marquer non terminé' : 'Marquer terminé'}><CheckCircle2/></button>
        <div><strong>{task.label}</strong><small>{task.detail}</small></div>
        <Link to={task.href}>Vérifier</Link>
      </article>)}
    </section>

    <section className="card endofday-summary">
      <div><p className="eyebrow">COMPTE RENDU</p><h2>Résumé prêt à partager</h2></div>
      <pre>{summary}</pre>
      <button className="primary" onClick={copySummary}><Copy/>{copied ? 'Copié' : 'Copier le bilan'}</button>
    </section>
  </>;
}
