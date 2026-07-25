import type { Client, Mission } from '../types/domain';

export const demoClients: Client[] = [
  { id: 'c1', first_name: 'Jean', last_name: 'Dupont', company_name: null, phone: '06 12 34 56 78', email: 'jean@example.fr', address: '12 rue Sommeiller, Annecy', notes: null, created_at: new Date().toISOString() },
  { id: 'c2', first_name: 'Claire', last_name: 'Martin', company_name: 'Martin SARL', phone: '06 87 65 43 21', email: 'claire@martin.fr', address: '4 avenue de Genève, Annecy', notes: 'Accès par portail arrière', created_at: new Date().toISOString() },
];

const todayAt = (hour: number) => { const d = new Date(); d.setHours(hour, 0, 0, 0); return d.toISOString(); };
export const demoMissions: Mission[] = [
  { id: 'm1', client_id: 'c1', title: 'Remplacement chauffe-eau 200 L', description: 'Dépose de l’ancien ballon et raccordement du nouveau.', status: 'in_progress', address: '12 rue Sommeiller, Annecy', scheduled_start: todayAt(9), scheduled_end: todayAt(12), started_at: todayAt(9), finished_at: null, price_ht: 1450, created_at: new Date().toISOString(), client: demoClients[0] },
  { id: 'm2', client_id: 'c2', title: 'Visite rénovation salle de bains', description: 'Relevé, photos et estimation.', status: 'planned', address: '4 avenue de Genève, Annecy', scheduled_start: todayAt(14), scheduled_end: todayAt(15), started_at: null, finished_at: null, price_ht: 0, created_at: new Date().toISOString(), client: demoClients[1] },
];
