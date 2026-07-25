import type { MissionStatus } from '../types/domain';
const labels: Record<MissionStatus, string> = { prospect:'Prospect', visit:'Visite', quote:'Devis', accepted:'Accepté', planned:'Planifié', in_progress:'En cours', completed:'Terminé', invoiced:'Facturé', paid:'Payé', archived:'Archivé' };
export function StatusBadge({ status }: { status: MissionStatus }) { return <span className={`badge badge-${status}`}>{labels[status]}</span>; }
