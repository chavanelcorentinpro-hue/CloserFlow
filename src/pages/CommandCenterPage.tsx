import { ArrowDown, ArrowRight, ArrowUp, Banknote, Boxes, BriefcaseBusiness, CheckCircle2, Clock3, Eye, EyeOff, FileWarning, Gauge, GripVertical, RotateCcw, Settings2, Sparkles, TrendingUp, TriangleAlert, X } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { money, totals } from '../lib/documents';
import { buildBusinessInsights, remainingInvoice } from '../lib/insights';

type WidgetId = 'kpis' | 'priorities' | 'health' | 'cashflow';
type LayoutItem = { id: WidgetId; visible: boolean };

const defaultLayout: LayoutItem[] = [
  { id: 'kpis', visible: true },
  { id: 'priorities', visible: true },
  { id: 'health', visible: true },
  { id: 'cashflow', visible: true },
];
const layoutKey = 'closerflow-command-center-layout-v1';
const widgetLabels: Record<WidgetId, string> = {
  kpis: 'Indicateurs principaux',
  priorities: 'Actions prioritaires',
  health: 'Contrôles rapides',
  cashflow: 'Trésorerie synthétique',
};

function readLayout(): LayoutItem[] {
  try {
    const value = JSON.parse(localStorage.getItem(layoutKey) ?? 'null') as LayoutItem[] | null;
    if (!Array.isArray(value)) return defaultLayout;
    const known = value.filter((item) => defaultLayout.some((entry) => entry.id === item.id));
    const missing = defaultLayout.filter((entry) => !known.some((item) => item.id === entry.id));
    return [...known, ...missing];
  } catch {
    return defaultLayout;
  }
}

function Widget({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return <section className="command-widget"><div className="section-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div></div>{children}</section>;
}

export function CommandCenterPage() {
  const { missions, quotes, invoices, inventory } = useAppData();
  const [layout, setLayout] = useState<LayoutItem[]>(readLayout);
  const [editing, setEditing] = useState(false);
  useEffect(() => localStorage.setItem(layoutKey, JSON.stringify(layout)), [layout]);

  const insights = buildBusinessInsights({ missions, quotes, invoices, inventory });
  const completed = missions.filter((mission) => mission.status === 'completed' || mission.status === 'invoiced' || mission.status === 'paid');
  const revenue = invoices.reduce((sum, invoice) => sum + totals(invoice.lines, invoice.discount_percent, invoice.vat_rate).ttc, 0);
  const collected = invoices.reduce((sum, invoice) => sum + (invoice.payments ?? []).reduce((value, payment) => value + payment.amount, 0), 0);
  const outstanding = invoices.reduce((sum, invoice) => sum + remainingInvoice(invoice), 0);
  const quoteValue = quotes.filter((quote) => quote.status === 'sent').reduce((sum, quote) => sum + totals(quote.lines, quote.discount_percent, quote.vat_rate).ttc, 0);
  const conversion = quotes.length ? Math.round((quotes.filter((quote) => quote.status === 'accepted').length / quotes.length) * 100) : 0;
  const lowStock = inventory.filter((item) => item.quantity <= item.minimum_quantity).length;
  const plannedNext7Days = missions.filter((mission) => {
    if (!mission.scheduled_start) return false;
    const date = new Date(mission.scheduled_start).getTime();
    return date >= Date.now() && date <= Date.now() + 7 * 86_400_000;
  }).length;
  const collectionRate = revenue > 0 ? Math.min(100, Math.round((collected / revenue) * 100)) : 0;
  const visibleWidgets = layout.filter((item) => item.visible);

  const widgets = useMemo<Record<WidgetId, ReactNode>>(() => ({
    kpis: <section className="command-kpis">
      <article><Banknote/><span>Facturé</span><strong>{money(revenue)}</strong><small>{money(collected)} encaissés</small></article>
      <article><Clock3/><span>À encaisser</span><strong>{money(outstanding)}</strong><small>solde total restant</small></article>
      <article><TrendingUp/><span>Devis en attente</span><strong>{money(quoteValue)}</strong><small>{conversion}% de conversion</small></article>
      <article><BriefcaseBusiness/><span>Chantiers terminés</span><strong>{completed.length}</strong><small>{plannedNext7Days} prévus sous 7 jours</small></article>
    </section>,
    priorities: <Widget title="À faire maintenant" eyebrow="COPILOTE LOCAL"><section className="insight-list">
      {insights.map((insight) => <article key={insight.id} className={`insight-card insight-${insight.severity}`}>
        <div className="insight-icon">{insight.severity === 'critical' ? <TriangleAlert/> : insight.severity === 'warning' ? <FileWarning/> : insight.severity === 'success' ? <CheckCircle2/> : <Sparkles/>}</div>
        <div><strong>{insight.title}</strong><p>{insight.description}</p></div>
        <Link to={insight.href}>{insight.actionLabel}<ArrowRight/></Link>
      </article>)}
    </section></Widget>,
    health: <Widget title="Contrôles rapides" eyebrow="ÉTAT DE L’ENTREPRISE"><section className="health-grid">
      <Link to="/end-of-day" className="health-closing"><Clock3/><div><strong>Faire le bilan de la journée</strong><small>Clôtures, facturation et stock</small></div><ArrowRight/></Link>
      <Link to="/inventory" className={lowStock ? 'health-warning' : ''}><Boxes/><div><strong>{lowStock ? `${lowStock} rupture(s) à prévenir` : 'Stock maîtrisé'}</strong><small>Articles au seuil minimum</small></div><ArrowRight/></Link>
      <Link to="/quotes"><FileWarning/><div><strong>{quotes.filter((quote) => quote.status === 'draft').length} devis en brouillon</strong><small>Documents à finaliser</small></div><ArrowRight/></Link>
      <Link to="/missions"><BriefcaseBusiness/><div><strong>{missions.filter((mission) => mission.status === 'in_progress').length} chantier en cours</strong><small>Suivi opérationnel</small></div><ArrowRight/></Link>
    </section></Widget>,
    cashflow: <Widget title="Trésorerie synthétique" eyebrow="ENCAISSEMENTS"><section className="cashflow-card">
      <div className="cashflow-ring" style={{'--progress': `${collectionRate * 3.6}deg`} as React.CSSProperties}><strong>{collectionRate}%</strong><span>encaissé</span></div>
      <div className="cashflow-details"><div><span>Montant facturé</span><strong>{money(revenue)}</strong></div><div><span>Déjà encaissé</span><strong>{money(collected)}</strong></div><div><span>Reste à recevoir</span><strong>{money(outstanding)}</strong></div></div>
      <Link className="primary small" to="/invoices">Gérer les paiements <ArrowRight/></Link>
    </section></Widget>,
  }), [collectionRate, collected, completed.length, conversion, insights, invoices, lowStock, missions, outstanding, plannedNext7Days, quoteValue, quotes, revenue]);

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= layout.length) return;
    setLayout((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return <>
    <section className="command-hero">
      <div><p className="eyebrow">CLOSERFLOW 5 · PILOTAGE</p><h1>Centre de commande</h1><p>Les chiffres importants et les actions prioritaires, réunis au même endroit.</p></div>
      <div className="command-hero-actions"><button className="ghost" onClick={() => setEditing(true)}><Settings2/>Personnaliser</button><div className="command-score"><Gauge/><span>Priorités</span><strong>{insights.filter((item) => item.severity !== 'success').length}</strong></div></div>
    </section>

    {visibleWidgets.map((item) => <div key={item.id} className="command-widget-wrap">{widgets[item.id]}</div>)}

    {editing && <div className="layout-backdrop" role="presentation" onMouseDown={() => setEditing(false)}><aside className="layout-panel" role="dialog" aria-modal="true" aria-label="Personnaliser le centre de commande" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><p className="eyebrow">TABLEAU DE BORD</p><h2>Personnaliser</h2></div><button className="icon-button" onClick={() => setEditing(false)} aria-label="Fermer"><X/></button></header>
      <p className="layout-help">Choisis les blocs visibles et leur ordre. La disposition est enregistrée automatiquement sur cet appareil.</p>
      <div className="layout-list">{layout.map((item, index) => <article key={item.id}>
        <GripVertical className="drag-handle"/><strong>{widgetLabels[item.id]}</strong>
        <button onClick={() => setLayout((current) => current.map((entry) => entry.id === item.id ? {...entry, visible: !entry.visible} : entry))} aria-label={item.visible ? 'Masquer' : 'Afficher'}>{item.visible ? <Eye/> : <EyeOff/>}</button>
        <button onClick={() => move(index, -1)} disabled={index === 0} aria-label="Monter"><ArrowUp/></button>
        <button onClick={() => move(index, 1)} disabled={index === layout.length - 1} aria-label="Descendre"><ArrowDown/></button>
      </article>)}</div>
      <footer><button className="ghost" onClick={() => setLayout(defaultLayout)}><RotateCcw/>Réinitialiser</button><button className="primary" onClick={() => setEditing(false)}>Terminer</button></footer>
    </aside></div>}
  </>;
}
