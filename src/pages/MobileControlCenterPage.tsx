import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Banknote, CalendarClock, CheckCircle2, CircleDollarSign, ClipboardList,
  Clock3, Download, FileCheck2, FileWarning, HardHat, HeartPulse, PackageSearch,
  PhoneCall, RefreshCcw, ShieldCheck, Smartphone, Sparkles, Target, UserRoundCheck,
  Users, WalletCards, Wrench
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

type LocalTask = {
  id: string;
  label: string;
  note: string;
  due: string;
  done: boolean;
  created_at: string;
};

type HealthItem = {
  id: string;
  label: string;
  detail: string;
  count: number;
  href: string;
  severity: 'ok' | 'warning' | 'critical';
};

const TASK_KEY = 'closerflow.mobile-control.tasks.v13.3';
const DAY_MS = 86400000;
const euro = (value: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value || 0);
const day = (value: Date | string) => new Date(value).toISOString().slice(0, 10);
const nowDay = () => day(new Date());
const readTasks = (): LocalTask[] => {
  try {
    const value = JSON.parse(localStorage.getItem(TASK_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};
const invoiceTotal = (invoice: { lines: { quantity: number; unit_price_ht: number }[]; discount_percent: number; vat_rate: number }) => {
  const ht = invoice.lines.reduce((sum, line) => sum + line.quantity * line.unit_price_ht, 0) * (1 - (invoice.discount_percent || 0) / 100);
  return ht * (1 + (invoice.vat_rate || 0) / 100);
};
const quoteTotal = (quote: { lines: { quantity: number; unit_price_ht: number }[]; discount_percent: number }) =>
  quote.lines.reduce((sum, line) => sum + line.quantity * line.unit_price_ht, 0) * (1 - (quote.discount_percent || 0) / 100);

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  const csv = '\ufeff' + rows.map(row => row.map(escape).join(';')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function MobileControlCenterPage() {
  const { clients, missions, quotes, invoices, team, inventory, timeEntries, businessExpenses, maintenanceContracts } = useAppData();
  const [tab, setTab] = useState<'today' | 'cash' | 'health'>('today');
  const [tasks, setTasks] = useState<LocalTask[]>(readTasks);
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [due, setDue] = useState(nowDay());
  const today = nowDay();
  const now = Date.now();

  const saveTasks = (next: LocalTask[]) => {
    setTasks(next);
    localStorage.setItem(TASK_KEY, JSON.stringify(next));
  };

  const metrics = useMemo(() => {
    const invoiceRows = invoices.map(invoice => {
      const total = invoiceTotal(invoice);
      const paid = (invoice.payments || []).reduce((sum, payment) => sum + payment.amount, 0);
      return { invoice, total, paid, remaining: Math.max(0, total - paid) };
    });
    const receivable = invoiceRows.reduce((sum, row) => sum + row.remaining, 0);
    const overdue = invoiceRows.filter(row => row.invoice.status === 'overdue' || (!!row.invoice.due_date && new Date(row.invoice.due_date).getTime() < now && row.remaining > 0));
    const overdueAmount = overdue.reduce((sum, row) => sum + row.remaining, 0);
    const acceptedQuotes = quotes.filter(quote => quote.status === 'accepted');
    const pipeline = quotes.filter(quote => ['sent', 'accepted'].includes(quote.status)).reduce((sum, quote) => sum + quoteTotal(quote), 0);
    const month = new Date().toISOString().slice(0, 7);
    const billedMonth = invoices.filter(invoice => invoice.created_at.startsWith(month)).reduce((sum, invoice) => sum + invoiceTotal(invoice), 0);
    const expensesMonth = businessExpenses.filter(expense => expense.expense_date.startsWith(month)).reduce((sum, expense) => sum + expense.amount_ht * (1 + expense.vat_rate / 100), 0);
    return { receivable, overdue, overdueAmount, acceptedQuotes, pipeline, billedMonth, expensesMonth, monthMargin: billedMonth - expensesMonth };
  }, [businessExpenses, invoices, quotes, now]);

  const todayMissions = useMemo(() => missions
    .filter(mission => mission.scheduled_start && day(mission.scheduled_start) === today)
    .sort((a, b) => new Date(a.scheduled_start!).getTime() - new Date(b.scheduled_start!).getTime()), [missions, today]);

  const activeTimers = useMemo(() => timeEntries.filter(entry => !entry.ended_at), [timeEntries]);
  const lowStock = useMemo(() => inventory.filter(item => item.quantity <= item.minimum_quantity), [inventory]);
  const dueContracts = useMemo(() => maintenanceContracts.filter(contract => contract.active && new Date(contract.next_due_date).getTime() <= now + 14 * DAY_MS), [maintenanceContracts, now]);

  const health = useMemo<HealthItem[]>(() => {
    const unfinishedMissions = missions.filter(mission => ['accepted', 'planned', 'in_progress'].includes(mission.status) && !mission.assigned_user_id);
    const unscheduled = missions.filter(mission => ['accepted', 'planned'].includes(mission.status) && (!mission.scheduled_start || !mission.scheduled_end));
    const contactless = clients.filter(client => !client.phone && !client.email);
    const staleQuotes = quotes.filter(quote => quote.status === 'sent' && now - new Date(quote.created_at).getTime() > 7 * DAY_MS);
    const invoiceIssues = invoices.filter(invoice => invoice.status === 'overdue' || invoice.status === 'partial');
    const inactivePeople = team.filter(member => !member.active);
    const issues: HealthItem[] = [
      { id: 'assignment', label: 'Chantiers sans responsable', detail: 'Missions acceptées, planifiées ou en cours sans collaborateur affecté.', count: unfinishedMissions.length, href: '/missions', severity: unfinishedMissions.length ? 'critical' : 'ok' },
      { id: 'schedule', label: 'Chantiers non planifiés', detail: 'Travaux acceptés sans créneau complet.', count: unscheduled.length, href: '/smart-planning', severity: unscheduled.length ? 'warning' : 'ok' },
      { id: 'contacts', label: 'Clients sans contact', detail: 'Aucun téléphone ni e-mail enregistré.', count: contactless.length, href: '/clients', severity: contactless.length ? 'warning' : 'ok' },
      { id: 'quotes', label: 'Devis à relancer', detail: 'Devis envoyés depuis plus de 7 jours.', count: staleQuotes.length, href: '/follow-ups', severity: staleQuotes.length ? 'warning' : 'ok' },
      { id: 'invoices', label: 'Factures à traiter', detail: 'Factures en retard ou partiellement réglées.', count: invoiceIssues.length, href: '/invoices', severity: invoiceIssues.length ? 'critical' : 'ok' },
      { id: 'stock', label: 'Articles sous seuil', detail: 'Stock inférieur ou égal au minimum défini.', count: lowStock.length, href: '/inventory', severity: lowStock.length ? 'warning' : 'ok' },
      { id: 'timers', label: 'Chronomètres actifs', detail: 'Pointages démarrés et non terminés.', count: activeTimers.length, href: '/time-tracking', severity: activeTimers.length ? 'warning' : 'ok' },
      { id: 'team', label: 'Membres inactifs', detail: 'Comptes équipe conservés mais désactivés.', count: inactivePeople.length, href: '/team', severity: 'ok' }
    ];
    return issues;
  }, [activeTimers.length, clients, invoices, lowStock.length, missions, now, quotes, team]);

  const score = useMemo(() => {
    const weighted = health.reduce((sum, item) => sum + (item.severity === 'critical' ? item.count * 8 : item.severity === 'warning' ? item.count * 3 : 0), 0);
    return Math.max(0, Math.min(100, 100 - weighted));
  }, [health]);

  const urgentActions = useMemo(() => {
    const rows: { id: string; title: string; detail: string; href: string; priority: number; icon: typeof Wrench }[] = [];
    metrics.overdue.forEach(({ invoice, remaining }) => rows.push({ id: `invoice-${invoice.id}`, title: `Encaisser ${invoice.number}`, detail: `${euro(remaining)} restant`, href: `/invoices/${invoice.id}`, priority: 100, icon: CircleDollarSign }));
    missions.filter(mission => ['accepted', 'planned', 'in_progress'].includes(mission.status) && !mission.assigned_user_id).forEach(mission => rows.push({ id: `assign-${mission.id}`, title: 'Affecter le chantier', detail: mission.title, href: `/missions/${mission.id}`, priority: 85, icon: Users }));
    quotes.filter(quote => quote.status === 'sent' && now - new Date(quote.created_at).getTime() > 7 * DAY_MS).forEach(quote => rows.push({ id: `quote-${quote.id}`, title: `Relancer ${quote.number}`, detail: `${quote.title} · ${euro(quoteTotal(quote))}`, href: `/quotes/${quote.id}`, priority: 80, icon: PhoneCall }));
    activeTimers.forEach(entry => rows.push({ id: `timer-${entry.id}`, title: 'Arrêter un pointage', detail: team.find(member => member.id === entry.user_id)?.name || 'Collaborateur', href: '/time-tracking', priority: 90, icon: Clock3 }));
    lowStock.forEach(item => rows.push({ id: `stock-${item.id}`, title: `Réapprovisionner ${item.name}`, detail: `${item.quantity} ${item.unit} · seuil ${item.minimum_quantity}`, href: '/inventory', priority: 60, icon: PackageSearch }));
    dueContracts.forEach(contract => rows.push({ id: `contract-${contract.id}`, title: 'Entretien à planifier', detail: `${contract.title} · ${contract.next_due_date}`, href: '/contracts', priority: 65, icon: CalendarClock }));
    return rows.sort((a, b) => b.priority - a.priority).slice(0, 16);
  }, [activeTimers, dueContracts, lowStock, metrics.overdue, missions, now, quotes, team]);

  const todayTasks = tasks.filter(task => !task.done && task.due <= today);
  const completedTasks = tasks.filter(task => task.done);

  function addTask() {
    const clean = label.trim();
    if (!clean) return;
    saveTasks([{ id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, label: clean, note: note.trim(), due, done: false, created_at: new Date().toISOString() }, ...tasks]);
    setLabel('');
    setNote('');
    setDue(today);
  }

  function exportControl() {
    downloadCsv(`closerflow-controle-${today}.csv`, [
      ['Type', 'Élément', 'Détail', 'Valeur'],
      ['Finance', 'À encaisser', '', metrics.receivable],
      ['Finance', 'En retard', `${metrics.overdue.length} facture(s)`, metrics.overdueAmount],
      ['Commercial', 'Pipeline', '', metrics.pipeline],
      ['Opérations', 'Missions aujourd’hui', '', todayMissions.length],
      ...health.map(item => ['Santé', item.label, item.detail, item.count]),
      ...tasks.map(task => ['Tâche', task.label, task.note, task.done ? 'Terminée' : task.due])
    ]);
  }

  return <div className="mobile-control-page">
    <div className="page-title mobile-control-heading">
      <div><p className="eyebrow">CLOSERFLOW 13.3 · MOBILE CONTROL</p><h1>Centre mobile</h1><p className="muted-copy">Une vue unique pour savoir quoi faire, quoi encaisser et ce qui doit être corrigé.</p></div>
      <div className="mobile-health-score"><HeartPulse/><strong>{score}</strong><span>/100</span></div>
    </div>

    <div className="mobile-control-tabs">
      <button className={tab === 'today' ? 'primary' : 'secondary'} onClick={() => setTab('today')}><Smartphone/>Aujourd’hui</button>
      <button className={tab === 'cash' ? 'primary' : 'secondary'} onClick={() => setTab('cash')}><WalletCards/>Encaissements</button>
      <button className={tab === 'health' ? 'primary' : 'secondary'} onClick={() => setTab('health')}><ShieldCheck/>Contrôle</button>
      <button className="secondary" onClick={exportControl}><Download/>CSV</button>
    </div>

    {tab === 'today' && <>
      <section className="mobile-kpi-grid">
        <article><HardHat/><div><strong>{todayMissions.length}</strong><span>intervention(s) aujourd’hui</span></div></article>
        <article><ClipboardList/><div><strong>{urgentActions.length}</strong><span>action(s) détectée(s)</span></div></article>
        <article><Clock3/><div><strong>{activeTimers.length}</strong><span>pointage(s) actif(s)</span></div></article>
        <article><Target/><div><strong>{todayTasks.length}</strong><span>tâche(s) locale(s) à faire</span></div></article>
      </section>

      <div className="mobile-control-grid">
        <section className="panel"><div className="panel-heading"><div><h2>Planning du jour</h2><p>Les missions dans l’ordre horaire.</p></div><CalendarClock/></div>
          <div className="mobile-agenda">{todayMissions.length ? todayMissions.map(mission => <Link to={`/missions/${mission.id}`} key={mission.id} className="mobile-agenda-row"><span>{mission.scheduled_start ? new Date(mission.scheduled_start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span><div><strong>{mission.title}</strong><small>{mission.address || 'Adresse non renseignée'}</small></div><b>{team.find(member => member.id === mission.assigned_user_id)?.name || 'À affecter'}</b></Link>) : <div className="empty-state compact">Aucune mission planifiée aujourd’hui.</div>}</div>
        </section>
        <section className="panel"><div className="panel-heading"><div><h2>Liste personnelle</h2><p>Conservée localement dans l’application.</p></div><CheckCircle2/></div>
          <div className="mobile-task-form"><input value={label} onChange={event => setLabel(event.target.value)} placeholder="Ex. rappeler le fournisseur"/><input type="date" value={due} onChange={event => setDue(event.target.value)}/><input value={note} onChange={event => setNote(event.target.value)} placeholder="Note facultative"/><button className="primary" onClick={addTask}>Ajouter</button></div>
          <div className="mobile-task-list">{tasks.slice(0, 12).map(task => <article className={task.done ? 'done' : ''} key={task.id}><button aria-label="Changer le statut" onClick={() => saveTasks(tasks.map(row => row.id === task.id ? { ...row, done: !row.done } : row))}>{task.done ? <CheckCircle2/> : <Target/>}</button><div><strong>{task.label}</strong><small>{task.due}{task.note ? ` · ${task.note}` : ''}</small></div><button className="icon-danger" aria-label="Supprimer" onClick={() => saveTasks(tasks.filter(row => row.id !== task.id))}>×</button></article>)}{!tasks.length && <p className="muted-copy">Aucune tâche personnelle.</p>}</div>
          {!!completedTasks.length && <button className="secondary small" onClick={() => saveTasks(tasks.filter(task => !task.done))}><RefreshCcw/>Nettoyer les terminées</button>}
        </section>
      </div>

      <section className="panel"><div className="panel-heading"><div><h2>Priorités automatiques</h2><p>Construites à partir des données déjà présentes dans CloserFlow.</p></div><Sparkles/></div>
        <div className="mobile-priority-list">{urgentActions.length ? urgentActions.map(action => { const Icon = action.icon; return <Link to={action.href} key={action.id}><Icon/><div><strong>{action.title}</strong><small>{action.detail}</small></div><span>{action.priority}</span></Link> }) : <div className="empty-state compact"><CheckCircle2/><strong>Aucune urgence détectée</strong></div>}</div>
      </section>
    </>}

    {tab === 'cash' && <>
      <section className="mobile-kpi-grid cash">
        <article><Banknote/><div><strong>{euro(metrics.receivable)}</strong><span>à encaisser</span></div></article>
        <article className={metrics.overdueAmount > 0 ? 'danger' : ''}><FileWarning/><div><strong>{euro(metrics.overdueAmount)}</strong><span>en retard</span></div></article>
        <article><FileCheck2/><div><strong>{euro(metrics.pipeline)}</strong><span>pipeline devis</span></div></article>
        <article><CircleDollarSign/><div><strong>{euro(metrics.monthMargin)}</strong><span>solde brut du mois</span></div></article>
      </section>
      <div className="mobile-control-grid">
        <section className="panel"><h2>Factures à encaisser</h2><div className="mobile-cash-list">{metrics.overdue.length ? metrics.overdue.map(({ invoice, remaining }) => <Link to={`/invoices/${invoice.id}`} key={invoice.id}><div><strong>{invoice.number}</strong><small>{invoice.title} · échéance {invoice.due_date || 'non définie'}</small></div><b>{euro(remaining)}</b></Link>) : <div className="empty-state compact">Aucun impayé détecté.</div>}</div></section>
        <section className="panel"><h2>Opportunités immédiates</h2><div className="mobile-cash-list">{metrics.acceptedQuotes.map(quote => <Link to={`/quotes/${quote.id}`} key={quote.id}><div><strong>{quote.number}</strong><small>{quote.title} · devis accepté</small></div><b>{euro(quoteTotal(quote))}</b></Link>)}{!metrics.acceptedQuotes.length && <div className="empty-state compact">Aucun devis accepté en attente.</div>}</div></section>
      </div>
      <section className="panel mobile-month-summary"><h2>Mois en cours</h2><div><span>Facturé</span><strong>{euro(metrics.billedMonth)}</strong></div><div><span>Dépenses</span><strong>{euro(metrics.expensesMonth)}</strong></div><div><span>Solde brut</span><strong>{euro(metrics.monthMargin)}</strong></div></section>
    </>}

    {tab === 'health' && <>
      <section className="panel mobile-health-banner"><div><HeartPulse/><div><h2>Indice de fiabilité : {score}/100</h2><p>{score >= 85 ? 'Les données sont globalement propres.' : score >= 60 ? 'Quelques points méritent une correction.' : 'Plusieurs anomalies opérationnelles doivent être traitées.'}</p></div></div><Link className="primary" to="/backup-center">Sauvegarder</Link></section>
      <div className="mobile-health-grid">{health.map(item => <Link to={item.href} key={item.id} className={`panel health-${item.severity}`}><div>{item.severity === 'ok' ? <CheckCircle2/> : <AlertTriangle/>}<strong>{item.count}</strong></div><h2>{item.label}</h2><p>{item.detail}</p><span>{item.count ? 'Ouvrir et corriger' : 'Contrôle OK'}</span></Link>)}</div>
      <section className="panel"><div className="panel-heading"><div><h2>Contrôles recommandés</h2><p>Routine avant sauvegarde ou mise à jour APK.</p></div><UserRoundCheck/></div><div className="mobile-checklist"><span><CheckCircle2/>Vérifier les factures en retard</span><span><CheckCircle2/>Fermer les chronomètres actifs</span><span><CheckCircle2/>Affecter les chantiers à venir</span><span><CheckCircle2/>Contrôler le stock critique</span><span><CheckCircle2/>Exporter une sauvegarde avant une mise à jour importante</span></div></section>
    </>}
  </div>;
}
