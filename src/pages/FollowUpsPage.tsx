import { Check, Clipboard, ExternalLink, Mail, MessageSquareText, Phone, RefreshCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { money, totals } from '../lib/documents';
import { remainingInvoice } from '../lib/insights';

type FollowUpState = Record<string, { contactedAt: string; channel: 'copy' | 'email' | 'phone' }>;
const storageKey = 'closerflow-follow-ups-v1';
const DAY = 86_400_000;

function readState(): FollowUpState {
  try { return JSON.parse(localStorage.getItem(storageKey) ?? '{}') as FollowUpState; } catch { return {}; }
}

function clientName(client: { first_name: string; last_name: string; company_name: string | null } | undefined) {
  if (!client) return 'Client';
  return client.company_name || `${client.first_name} ${client.last_name}`.trim() || 'Client';
}

export function FollowUpsPage() {
  const { clients, quotes, invoices, company } = useAppData();
  const [followUps, setFollowUps] = useState<FollowUpState>(readState);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  const items = useMemo(() => {
    const now = Date.now();
    const invoiceItems = invoices
      .filter((invoice) => invoice.status === 'overdue' || (!!invoice.due_date && new Date(invoice.due_date).getTime() < now && remainingInvoice(invoice) > 0))
      .map((invoice) => {
        const client = clients.find((row) => row.id === invoice.client_id);
        const amount = remainingInvoice(invoice);
        const due = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('fr-FR') : 'échue';
        return {
          id: `invoice:${invoice.id}`,
          type: 'Facture impayée',
          priority: 100,
          title: `${invoice.number} · ${money(amount)}`,
          subtitle: `Échéance : ${due}`,
          href: `/invoices/${invoice.id}`,
          client,
          message: `Bonjour ${clientName(client)},\n\nSauf erreur de notre part, le règlement de la facture ${invoice.number} d’un montant restant de ${money(amount)} n’a pas encore été reçu. Pouvez-vous nous indiquer quand le paiement pourra être effectué ?\n\nMerci par avance.\n${company.name}`,
        };
      });

    const quoteItems = quotes
      .filter((quote) => ['draft', 'sent'].includes(quote.status) && now - new Date(quote.created_at).getTime() > 7 * DAY)
      .map((quote) => {
        const client = clients.find((row) => row.id === quote.client_id);
        const amount = totals(quote.lines, quote.discount_percent, quote.vat_rate).ttc;
        const age = Math.max(7, Math.floor((now - new Date(quote.created_at).getTime()) / DAY));
        return {
          id: `quote:${quote.id}`,
          type: 'Devis à relancer',
          priority: 70 + Math.min(age, 20),
          title: `${quote.number} · ${money(amount)}`,
          subtitle: `Sans réponse depuis ${age} jours`,
          href: `/quotes/${quote.id}`,
          client,
          message: `Bonjour ${clientName(client)},\n\nJe me permets de revenir vers vous concernant le devis ${quote.number} pour « ${quote.title} », d’un montant de ${money(amount)}. Avez-vous pu en prendre connaissance ? Je reste disponible pour toute question ou adaptation.\n\nBien cordialement,\n${company.name}`,
        };
      });

    return [...invoiceItems, ...quoteItems].sort((a, b) => b.priority - a.priority);
  }, [clients, company.name, invoices, quotes]);

  function mark(id: string, channel: FollowUpState[string]['channel']) {
    const next = { ...followUps, [id]: { contactedAt: new Date().toISOString(), channel } };
    setFollowUps(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  }

  async function copy(item: (typeof items)[number]) {
    await navigator.clipboard.writeText(item.message);
    mark(item.id, 'copy');
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId(null), 1800);
  }

  const visible = items.filter((item) => showDone || !followUps[item.id]);
  const doneCount = items.filter((item) => followUps[item.id]).length;

  return <>
    <section className="followup-hero">
      <div><p className="eyebrow">RELANCES CLIENTS</p><h1>Centre de relance</h1><p>Des messages prêts à envoyer pour les devis sans réponse et les factures impayées.</p></div>
      <div className="followup-summary"><strong>{items.length - doneCount}</strong><span>à traiter</span><small>{doneCount} déjà contactée{doneCount > 1 ? 's' : ''}</small></div>
    </section>

    <div className="followup-toolbar">
      <button className={showDone ? 'ghost active' : 'ghost'} onClick={() => setShowDone((value) => !value)}>{showDone ? <Check/> : <RefreshCcw/>}{showDone ? 'Relances traitées visibles' : 'Afficher les relances traitées'}</button>
    </div>

    <section className="followup-list">
      {visible.map((item) => {
        const done = followUps[item.id];
        const email = item.client?.email ?? '';
        const phone = item.client?.phone ?? '';
        return <article key={item.id} className={done ? 'followup-card done' : 'followup-card'}>
          <header><div><span className="followup-type">{item.type}</span><h2>{clientName(item.client)}</h2><p>{item.title} · {item.subtitle}</p></div>{done && <span className="followup-done"><Check/>Contacté le {new Date(done.contactedAt).toLocaleDateString('fr-FR')}</span>}</header>
          <textarea readOnly value={item.message} aria-label={`Message pour ${clientName(item.client)}`} />
          <footer>
            <button className="primary" onClick={() => copy(item)}>{copiedId === item.id ? <Check/> : <Clipboard/>}{copiedId === item.id ? 'Copié' : 'Copier le message'}</button>
            {email && <a className="ghost" href={`mailto:${email}?subject=${encodeURIComponent(item.type)}&body=${encodeURIComponent(item.message)}`} onClick={() => mark(item.id, 'email')}><Mail/>E-mail</a>}
            {phone && <a className="ghost" href={`tel:${phone}`} onClick={() => mark(item.id, 'phone')}><Phone/>Appeler</a>}
            <Link className="ghost" to={item.href}><ExternalLink/>Ouvrir le document</Link>
          </footer>
        </article>;
      })}
      {!visible.length && <div className="empty-state"><MessageSquareText/><h2>Tout est relancé</h2><p>Aucune relance en attente avec les données actuelles.</p></div>}
    </section>
  </>;
}
