import { Clock3, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import type { Mission } from '../types/domain';
import { StatusBadge } from './StatusBadge';

export function MissionCard({ mission }: { mission: Mission }) {
  const clientName = mission.client ? (mission.client.company_name || `${mission.client.first_name} ${mission.client.last_name}`) : 'Client non renseigné';
  return <Link className="mission-card" to={`/missions/${mission.id}`}>
    <div className="mission-card-top"><div><p className="eyebrow">{clientName}</p><h3>{mission.title}</h3></div><StatusBadge status={mission.status} /></div>
    <div className="meta-row"><span><Clock3 size={16}/>{mission.scheduled_start ? format(new Date(mission.scheduled_start), 'EEE d MMM · HH:mm', { locale: fr }) : 'À planifier'}</span><span><MapPin size={16}/>{mission.address || 'Adresse à renseigner'}</span></div>
  </Link>;
}
