import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CircleDollarSign, Clock3, Download, PackageSearch, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const day = 86_400_000;

function invoiceTotal(invoice: ReturnType<typeof useAppData>['invoices'][number]) {
  const ht = invoice.lines.reduce((sum, line) => sum + line.quantity * line.unit_price_ht, 0);
  return ht * (1 - (invoice.discount_percent ?? 0) / 100) * (1 + invoice.vat_rate / 100);
}

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

export function OperationsControlPage() {
  const { missions, invoices, quotes, inventory, team, timeEntries, clients } = useAppData();
  const [scope, setScope] = useState<'all' | 'urgent' | 'planning' | 'finance' | 'stock'>('all');
  const now = Date.now();

  const data = useMemo(() => {
    const overdueInvoices = invoices
      .filter(invoice => invoice.status !== 'paid' && invoice.due_date && new Date(invoice.due_date).getTime() < now)
      .map(invoice => {
        const paid = (invoice.payments ?? []).reduce((sum, payment) => sum + payment.amount, 0);
        return { invoice, remaining: Math.max(0, invoiceTotal(invoice) - paid) };
      });

    const unassigned = missions.filter(mission =>
      ['accepted', 'planned', 'in_progress'].includes(mission.status) && !mission.assigned_user_id
    );

    const upcoming = missions.filter(mission => {
      if (!mission.scheduled_start || ['completed', 'invoiced', 'paid', 'archived'].includes(mission.status)) return false;
      const start = new Date(mission.scheduled_start).getTime();
      return start >= now && start <= now + 3 * day;
    });

    const conflicts: Array<{ firstId: string; secondId: string; userId: string }> = [];
    const planned = missions.filter(mission => mission.assigned_user_id && mission.scheduled_start && mission.scheduled_end);
    for (let i = 0; i < planned.length; i += 1) {
      for (let j = i + 1; j < planned.length; j += 1) {
        const first = planned[i];
        const second = planned[j];
        if (first.assigned_user_id !== second.assigned_user_id) continue;
        const overlaps = new Date(first.scheduled_start!).getTime() < new Date(second.scheduled_end!).getTime()
          && new Date(second.scheduled_start!).getTime() < new Date(first.scheduled_end!).getTime();
        if (overlaps) conflicts.push({ firstId: first.id, secondId: second.id, userId: first.assigned_user_id! });
      }
    }

    const lowStock = inventory.filter(item => item.quantity <= item.minimum_quantity);
    const staleQuotes = quotes.filter(quote => quote.status === 'sent' && now - new Date(quote.created_at).getTime() >= 7 * day);
    const activeTimers = timeEntries.filter(entry => !entry.ended_at);
    const inactiveTeam = team.filter(member => !member.active);

    return { overdueInvoices, unassigned, upcoming, conflicts, lowStock, staleQuotes, activeTimers, inactiveTeam };
  }, [invoices, inventory, missions, now, quotes, team, timeEntries]);

  const totalOverdue = data.overdueInvoices.reduce((sum, row) => sum + row.remaining, 0);
  const urgentCount = data.overdueInvoices.length + data.conflicts.length + data.unassigned.length + data.lowStock.length;

  const actions = useMemo(() => {
    const rows: Array<{ type: 'finance' | 'planning' | 'stock'; severity: 'urgent' | 'warning'; title: string; detail: string; href: string }> = [];
    data.overdueInvoices.forEach(({ invoice, remaining }) => rows.push({
      type: 'finance', severity: 'urgent', title: `Facture ${invoice.number} échue`, detail: `${eur.format(remaining)} restent à encaisser`, href: `/invoices/${invoice.id}`
    }));
    data.conflicts.forEach(conflict => {
      const first = missions.find(mission => mission.id === conflict.firstId);
      const second = missions.find(mission => mission.id === conflict.secondId);
      const member = team.find(person => person.id === conflict.userId);
      rows.push({ type: 'planning', severity: 'urgent', title: `Conflit de planning · ${member?.name ?? 'Équipe'}`, detail: `${first?.title ?? 'Mission'} chevauche ${second?.title ?? 'Mission'}`, href: '/planning' });
    });
    data.unassigned.forEach(mission => rows.push({ type: 'planning', severity: 'warning', title: `Mission sans responsable`, detail: mission.title, href: `/missions/${mission.id}` }));
    data.lowStock.forEach(item => rows.push({ type: 'stock', severity: item.quantity <= 0 ? 'urgent' : 'warning', title: `Stock faible · ${item.name}`, detail: `${item.quantity} ${item.unit} disponibles · seuil ${item.minimum_quantity}`, href: '/inventory' }));
    data.staleQuotes.forEach(quote => rows.push({ type: 'finance', severity: 'warning', title: `Devis à relancer · ${quote.number}`, detail: quote.title, href: `/quotes/${quote.id}` }));
    return rows.filter(row => scope === 'all' || (scope === 'urgent' ? row.severity === 'urgent' : row.type === scope));
  }, [data, missions, scope, team]);

  const exportCsv = () => {
    const header = ['Priorité', 'Domaine', 'Action', 'Détail'];
    const lines = actions.map(action => [action.severity, action.type, action.title, action.detail]);
    const csv = [header, ...lines].map(row => row.map(csvEscape).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `closerflow-actions-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const clientName = (clientId: string | null) => {
    const client = clients.find(row => row.id === clientId);
    return client ? client.company_name || `${client.first_name} ${client.last_name}`.trim() : 'Client non renseigné';
  };

  return <div className="operations-page">
    <div className="page-title operations-heading"><div><p className="eyebrow">PILOTAGE</p><h1>Contrôle opérationnel</h1><p>Les actions qui évitent les retards, les oublis et les pertes de marge.</p></div><ShieldCheck /></div>

    <section className="operations-kpis">
      <article><CircleDollarSign/><div><strong>{eur.format(totalOverdue)}</strong><span>à encaisser en retard</span></div></article>
      <article><AlertTriangle/><div><strong>{urgentCount}</strong><span>alertes prioritaires</span></div></article>
      <article><CalendarClock/><div><strong>{data.upcoming.length}</strong><span>missions sous 3 jours</span></div></article>
      <article><Users/><div><strong>{data.unassigned.length}</strong><span>missions non affectées</span></div></article>
      <article><PackageSearch/><div><strong>{data.lowStock.length}</strong><span>articles sous le seuil</span></div></article>
      <article><Clock3/><div><strong>{data.activeTimers.length}</strong><span>chronomètres actifs</span></div></article>
    </section>

    <section className="assistant-card operations-actions-card">
      <header><div><h2>Plan d’action</h2><p>{actions.length} élément{actions.length > 1 ? 's' : ''} à traiter selon le filtre choisi.</p></div><button className="secondary-button" onClick={exportCsv} disabled={!actions.length}><Download/>Exporter CSV</button></header>
      <div className="operations-filters">
        {(['all', 'urgent', 'planning', 'finance', 'stock'] as const).map(value => <button key={value} className={scope === value ? 'active' : ''} onClick={() => setScope(value)}>{value === 'all' ? 'Tout' : value === 'urgent' ? 'Urgent' : value === 'planning' ? 'Planning' : value === 'finance' ? 'Finance' : 'Stock'}</button>)}
      </div>
      <div className="operations-list">
        {actions.map((action, index) => <Link key={`${action.title}-${index}`} className={`operations-action ${action.severity}`} to={action.href}>
          <span className="operations-severity">{action.severity === 'urgent' ? 'Urgent' : 'À surveiller'}</span>
          <div><strong>{action.title}</strong><small>{action.detail}</small></div>
          <span>Ouvrir →</span>
        </Link>)}
        {!actions.length && <div className="empty-state"><ShieldCheck/><h2>Rien à signaler</h2><p>Aucune action ne correspond à ce filtre.</p></div>}
      </div>
    </section>

    <section className="operations-grid">
      <article className="assistant-card"><h2>Prochaines missions</h2><div className="operations-mini-list">{data.upcoming.slice(0, 6).map(mission => <Link to={`/missions/${mission.id}`} key={mission.id}><div><strong>{mission.title}</strong><small>{clientName(mission.client_id)}</small></div><time>{new Date(mission.scheduled_start!).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</time></Link>)}{!data.upcoming.length && <p className="muted">Aucune mission prévue dans les trois prochains jours.</p>}</div></article>
      <article className="assistant-card"><h2>Qualité d’organisation</h2><div className="operations-health"><p><span>Équipe active</span><strong>{team.filter(member => member.active).length}</strong></p><p><span>Collaborateurs inactifs</span><strong>{data.inactiveTeam.length}</strong></p><p><span>Devis à relancer</span><strong>{data.staleQuotes.length}</strong></p><p><span>Conflits détectés</span><strong>{data.conflicts.length}</strong></p></div></article>
    </section>
  </div>;
}
