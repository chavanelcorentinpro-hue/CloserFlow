import { useMemo, useState } from 'react';
import {
  AlertTriangle, BadgeEuro, BriefcaseBusiness, Clock3, Gauge,
  Hammer, ReceiptText, TrendingDown, TrendingUp, Truck
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { calculateProjectMargin, portfolioSummary } from '../lib/projectMarginV53';

const CONSUMPTION_KEY='closerflow.v52.invoice-stock-consumption';
const euro=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:2});

function loadConsumption():any[]{try{return JSON.parse(localStorage.getItem(CONSUMPTION_KEY)||'[]')}catch{return []}}

export function ProjectMarginV53Page(){
  const data=useAppData() as any;
  const [hourlyCost,setHourlyCost]=useState(35);
  const [travelPerMission,setTravelPerMission]=useState(20);

  const consumption=useMemo(()=>loadConsumption(),[]);
  const rows=useMemo(()=>{
    const missions=(data.missions||[]).filter((m:any)=>m.status!=='cancelled');

    return missions.map((mission:any)=>{
      const invoices=(data.invoices||[]).filter((i:any)=>i.mission_id===mission.id && i.status!=='cancelled');
      const invoiceIds=new Set(invoices.map((i:any)=>i.id));

      const revenue=invoices.reduce((sum:number,inv:any)=>
        sum+(inv.lines||[]).reduce((s:number,l:any)=>s+Number(l.quantity||1)*Number(l.unit_price_ht||l.unit_price||l.price||0),0)
      ,0);

      const materialCost=consumption
        .filter((c:any)=>invoiceIds.has(c.invoiceId))
        .reduce((s:number,c:any)=>s+Number(c.totalMaterialCost||0),0);

      const timeRows=(data.timeEntries||data.timeTracking||data.times||[]).filter((t:any)=>t.mission_id===mission.id||t.project_id===mission.id);
      let laborHours=timeRows.reduce((s:number,t:any)=>{
        if(Number(t.hours)>0)return s+Number(t.hours);
        if(t.started_at&&t.ended_at){
          return s+Math.max(0,(new Date(t.ended_at).getTime()-new Date(t.started_at).getTime())/3600000);
        }
        return s;
      },0);
      if(!laborHours)laborHours=Number(mission.actual_hours||mission.hours_spent||0);

      const expenses=(data.businessExpenses||[]).filter((e:any)=>e.mission_id===mission.id);
      const subcontractingCost=expenses
        .filter((e:any)=>String(e.category||'').toLowerCase().includes('sub'))
        .reduce((s:number,e:any)=>s+Number(e.amount_ht||0),0);

      const travelCost=expenses
        .filter((e:any)=>['travel','fuel','transport','deplacement','déplacement'].some(k=>String(e.category||'').toLowerCase().includes(k)))
        .reduce((s:number,e:any)=>s+Number(e.amount_ht||0),0) || (mission.distance_km||mission.travel_km?travelPerMission:0);

      const otherCosts=expenses
        .filter((e:any)=>{
          const c=String(e.category||'').toLowerCase();
          return !c.includes('sub')&&!['travel','fuel','transport','deplacement','déplacement','materials'].some(k=>c.includes(k));
        })
        .reduce((s:number,e:any)=>s+Number(e.amount_ht||0),0);

      return calculateProjectMargin({
        projectId:mission.id,
        projectTitle:mission.title||'Chantier',
        revenue,materialCost,laborHours,laborHourlyCost:hourlyCost,
        travelCost,subcontractingCost,otherCosts
      });
    }).sort((a:any,b:any)=>a.marginPercent-b.marginPercent);
  },[data.missions,data.invoices,data.businessExpenses,data.timeEntries,data.timeTracking,data.times,consumption,hourlyCost,travelPerMission]);

  const summary=portfolioSummary(rows);

  return <>
    <div className="page-title">
      <div>
        <p className="eyebrow">CLOSERFLOW 53 · REAL PROJECT MARGIN</p>
        <h1>Rentabilité chantier réelle</h1>
        <p>Matière, temps, déplacement, sous-traitance et autres frais réunis dans une seule marge chantier.</p>
      </div>
      <Gauge/>
    </div>

    <section className="v53-kpis">
      <article><ReceiptText/><span>CA analysé</span><strong>{euro.format(summary.revenue)}</strong></article>
      <article><BadgeEuro/><span>Coûts réels</span><strong>{euro.format(summary.cost)}</strong></article>
      <article className={summary.profit<0?'critical':''}><TrendingUp/><span>Bénéfice brut</span><strong>{euro.format(summary.profit)}</strong></article>
      <article className={summary.margin<10?'critical':summary.margin<25?'warning':''}><Gauge/><span>Marge globale</span><strong>{summary.margin.toFixed(1)} %</strong></article>
    </section>

    <section className="panel">
      <div className="section-heading"><div><p className="eyebrow">PARAMÈTRES DE COÛT</p><h2>Main-d’œuvre & déplacement</h2></div><Hammer/></div>
      <div className="v53-settings">
        <label>Coût horaire interne (€ / h)<input type="number" min="0" step="1" value={hourlyCost} onChange={e=>setHourlyCost(Number(e.target.value))}/></label>
        <label>Forfait déplacement par chantier (€)<input type="number" min="0" step="1" value={travelPerMission} onChange={e=>setTravelPerMission(Number(e.target.value))}/></label>
      </div>
      <p className="muted-copy">Le coût horaire doit représenter le coût réel supporté par l’entreprise, pas le tarif facturé au client.</p>
    </section>

    <section className="v53-status">
      <article><TrendingDown/><span>Critiques</span><strong>{summary.critical}</strong></article>
      <article><AlertTriangle/><span>À surveiller</span><strong>{summary.watch}</strong></article>
      <article><TrendingUp/><span>Sains</span><strong>{summary.healthy}</strong></article>
    </section>

    <section className="v53-list">
      {rows.map(row=><article key={row.projectId} className={row.status}>
        <div className="v53-title">
          <div><strong>{row.projectTitle}</strong><small>{row.laborHours.toFixed(1)} h · {euro.format(row.revenuePerHour)}/h de CA</small></div>
          <b>{row.marginPercent.toFixed(1)} %</b>
        </div>

        <div className="v53-costs">
          <span><ReceiptText/>CA <strong>{euro.format(row.revenue)}</strong></span>
          <span><BriefcaseBusiness/>Matière <strong>{euro.format(row.materialCost)}</strong></span>
          <span><Clock3/>Main-d’œuvre <strong>{euro.format(row.laborCost)}</strong></span>
          <span><Truck/>Déplacement <strong>{euro.format(row.travelCost)}</strong></span>
          <span><Hammer/>Sous-traitance <strong>{euro.format(row.subcontractingCost)}</strong></span>
          <span><BadgeEuro/>Autres <strong>{euro.format(row.otherCosts)}</strong></span>
        </div>

        <div className="v53-result">
          <span>Coût total <strong>{euro.format(row.totalCost)}</strong></span>
          <span>Bénéfice brut <strong>{euro.format(row.grossProfit)}</strong></span>
        </div>

        {row.warnings.length>0&&<div className="v53-warnings">{row.warnings.map(w=><p key={w}><AlertTriangle/>{w}</p>)}</div>}
      </article>)}
    </section>

    {!rows.length&&<section className="panel empty-state"><Gauge/><strong>Aucun chantier à analyser</strong><p>Ajoute des chantiers et des factures pour calculer leur rentabilité.</p></section>}
  </>;
}
