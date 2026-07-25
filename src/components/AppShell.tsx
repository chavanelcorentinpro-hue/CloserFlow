import { BriefcaseBusiness, CirclePlus, House, LogOut, Menu, Search, Users } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useV4Platform } from '../context/V4PlatformContext';
export function AppShell(){
 const navigate=useNavigate(); const {company}=useAppData(); const {displayName,signOut}=useAuth(); const {organizations,activeOrganizationId,setActiveOrganization}=useV4Platform();
 return <div className="app-shell"><header className="topbar"><div className="brand-mark">C</div><div className="brand-copy"><strong>CloserFlow <em>18.0</em></strong><small>{company.name} · {displayName}</small></div><select className="workspace-switcher" aria-label="Changer d’entreprise" value={activeOrganizationId} onChange={e=>setActiveOrganization(e.target.value)}>{organizations.map(org=><option key={org.id} value={org.id}>{org.name}</option>)}</select><button className="top-search" onClick={()=>navigate('/search')} aria-label="Rechercher"><Search/></button><button className="top-search" onClick={()=>{signOut();navigate('/login')}} aria-label="Déconnexion"><LogOut/></button></header>
 <main className="page"><Outlet/></main><nav className="bottom-nav"><NavLink to="/"><House/><span>Aujourd’hui</span></NavLink><NavLink to="/missions"><BriefcaseBusiness/><span>Missions</span></NavLink><button className="fab" onClick={()=>navigate('/missions/new')} aria-label="Créer"><CirclePlus/></button><NavLink to="/clients"><Users/><span>Clients</span></NavLink><NavLink to="/more"><Menu/><span>Plus</span></NavLink></nav></div>;
}
