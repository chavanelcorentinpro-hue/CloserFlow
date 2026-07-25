import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MissionCard } from '../components/MissionCard';
import { useAppData } from '../context/AppDataContext';
export function MissionsPage() {
 const { missions } = useAppData(); const [q,setQ]=useState('');
 const filtered=missions.filter(m => `${m.title} ${m.address} ${m.client?.first_name} ${m.client?.last_name} ${m.client?.company_name}`.toLowerCase().includes(q.toLowerCase()));
 return <><div className="section-heading"><div><p className="eyebrow">Pilotage</p><h1>Missions</h1></div><Link className="primary small" to="/missions/new"><Plus/>Nouvelle</Link></div><label className="search"><Search/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Client, chantier, adresse…"/></label><div className="stack">{filtered.map(m=><MissionCard key={m.id} mission={m}/>)}</div></>;
}
