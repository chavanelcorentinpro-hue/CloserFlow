import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BriefcaseBusiness, Boxes, MessageCircleMore, RefreshCw, Send, Trash2, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createActivity, deleteActivity, listActivity, type ActivityCategory, type ActivityItem } from '../lib/activity';

const categoryMeta: Record<ActivityCategory, { label: string; icon: typeof MessageCircleMore }> = {
  general: { label: 'Général', icon: MessageCircleMore },
  mission: { label: 'Chantier', icon: BriefcaseBusiness },
  client: { label: 'Client', icon: UserRound },
  stock: { label: 'Stock', icon: Boxes },
  urgent: { label: 'Urgent', icon: AlertTriangle },
};

export function ActivityFeedPage() {
  const { apiUrl, token, user } = useAuth();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<ActivityCategory>('general');
  const [filter, setFilter] = useState<ActivityCategory | 'all'>('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setBusy(true); setError('');
    try { setItems(await listActivity(apiUrl, token)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Impossible de charger le fil.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, [apiUrl, token]);

  const visible = useMemo(() => filter === 'all' ? items : items.filter(item => item.category === filter), [items, filter]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (message.trim().length < 2) return;
    setBusy(true); setError('');
    try {
      const item = await createActivity(apiUrl, token, { message: message.trim(), category });
      setItems(current => [item, ...current]); setMessage('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Publication impossible.'); }
    finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    if (!confirm('Supprimer cette publication ?')) return;
    try { await deleteActivity(apiUrl, token, id); setItems(current => current.filter(item => item.id !== id)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Suppression impossible.'); }
  };

  return <>
    <div className="page-title activity-title"><div><p className="eyebrow">COLLABORATION</p><h1>Fil d’équipe</h1><p>Partage les informations importantes avec les membres de ton espace.</p></div><button className="icon-button" onClick={() => void load()} aria-label="Actualiser"><RefreshCw className={busy ? 'spin' : ''}/></button></div>
    <form className="form-card activity-compose" onSubmit={submit}>
      <label>Type<select value={category} onChange={e => setCategory(e.target.value as ActivityCategory)}>{Object.entries(categoryMeta).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>
      <label>Message<textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={1000} placeholder="Ex. Le matériel du chantier Dupont est arrivé au dépôt."/></label>
      <div className="activity-compose-footer"><small>{message.length}/1000</small><button className="primary" disabled={busy || message.trim().length < 2}><Send/>Publier</button></div>
      {error && <p className="cloud-message error">{error}</p>}
    </form>
    <div className="activity-filters"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Tout</button>{Object.entries(categoryMeta).map(([key, value]) => <button key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key as ActivityCategory)}>{value.label}</button>)}</div>
    <section className="activity-feed">
      {visible.length === 0 ? <div className="empty-state"><MessageCircleMore/><h2>Aucune publication</h2><p>Le fil d’équipe apparaîtra ici.</p></div> : visible.map(item => {
        const meta = categoryMeta[item.category]; const Icon = meta.icon;
        const canDelete = item.authorId === user?.id || ['admin','manager'].includes(user?.role || '');
        return <article className={`activity-card category-${item.category}`} key={item.id}>
          <div className="activity-icon"><Icon/></div><div className="activity-body"><header><div><strong>{item.authorName}</strong><span>{meta.label} · {new Date(item.createdAt).toLocaleString('fr-FR')}</span></div>{canDelete && <button className="icon-button" onClick={() => void remove(item.id)} title="Supprimer"><Trash2/></button>}</header><p>{item.message}</p></div>
        </article>;
      })}
    </section>
  </>;
}
