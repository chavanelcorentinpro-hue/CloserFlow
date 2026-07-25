import { BriefcaseBusiness, FileText, ReceiptText, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { money, totals } from '../lib/documents';

export function SearchPage(){
 const {clients,missions,quotes,invoices}=useAppData(); const [query,setQuery]=useState('');
 const q=query.trim().toLowerCase();
 const results=useMemo(()=>{
  if(!q)return {clients:[],missions:[],quotes:[],invoices:[]};
  return {
   clients:clients.filter(c=>`${c.first_name} ${c.last_name} ${c.company_name??''} ${c.phone??''} ${c.email??''} ${c.address??''}`.toLowerCase().includes(q)).slice(0,8),
   missions:missions.filter(m=>`${m.title} ${m.description??''} ${m.address??''} ${m.client?.first_name??''} ${m.client?.last_name??''} ${m.client?.company_name??''}`.toLowerCase().includes(q)).slice(0,8),
   quotes:quotes.filter(d=>`${d.number} ${d.title} ${d.lines.map(l=>l.description).join(' ')}`.toLowerCase().includes(q)).slice(0,8),
   invoices:invoices.filter(d=>`${d.number} ${d.title} ${d.lines.map(l=>l.description).join(' ')}`.toLowerCase().includes(q)).slice(0,8)
  };
 },[q,clients,missions,quotes,invoices]);
 const count=Object.values(results).reduce((sum,rows)=>sum+rows.length,0);
 return <><div className="page-title"><div><p className="eyebrow">RECHERCHE GLOBALE</p><h1>Tout retrouver</h1></div></div>
 <label className="search global-search"><Search/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Client, téléphone, adresse, devis, facture…"/></label>
 {!q?<div className="empty-card">Saisis quelques lettres pour rechercher dans toute l’application.</div>:count===0?<div className="empty-card">Aucun résultat pour « {query} ».</div>:<div className="search-results">
  {results.clients.length>0&&<section><h2><Users/>Clients</h2>{results.clients.map(c=><Link className="search-result" to="/clients" key={c.id}><strong>{c.company_name||`${c.first_name} ${c.last_name}`}</strong><span>{c.phone||c.email||c.address||'Fiche client'}</span></Link>)}</section>}
  {results.missions.length>0&&<section><h2><BriefcaseBusiness/>Missions</h2>{results.missions.map(m=><Link className="search-result" to={`/missions/${m.id}`} key={m.id}><strong>{m.title}</strong><span>{m.address||m.client?.company_name||'Mission'}</span></Link>)}</section>}
  {results.quotes.length>0&&<section><h2><FileText/>Devis</h2>{results.quotes.map(d=><Link className="search-result result-with-amount" to={`/quotes/${d.id}`} key={d.id}><span><strong>{d.number}</strong><small>{d.title}</small></span><b>{money(totals(d.lines,d.discount_percent,d.vat_rate).ttc)}</b></Link>)}</section>}
  {results.invoices.length>0&&<section><h2><ReceiptText/>Factures</h2>{results.invoices.map(d=><Link className="search-result result-with-amount" to={`/invoices/${d.id}`} key={d.id}><span><strong>{d.number}</strong><small>{d.title}</small></span><b>{money(totals(d.lines,d.discount_percent,d.vat_rate).ttc)}</b></Link>)}</section>}
 </div>}</>;
}
