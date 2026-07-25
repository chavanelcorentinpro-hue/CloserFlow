import { useMemo, useState } from 'react';
import { Bot, CheckCircle2, FileText, Mic, MicOff, Sparkles, WandSparkles, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import type { DocumentLine } from '../types/domain';
import { createId } from '../lib/id';

type SpeechRecognitionCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

declare global { interface Window { webkitSpeechRecognition?: SpeechRecognitionCtor; SpeechRecognition?: SpeechRecognitionCtor } }

const uid=()=>createId();
const catalog=[
 {keys:['chauffe-eau','ballon'],description:'Fourniture et pose chauffe-eau',unit:'forfait',price:1450},
 {keys:['wc suspendu','toilette suspendue'],description:'Fourniture et pose WC suspendu',unit:'forfait',price:980},
 {keys:['mitigeur','robinet'],description:'Remplacement de robinetterie',unit:'forfait',price:220},
 {keys:['fuite','dépannage'],description:'Recherche de fuite et réparation',unit:'forfait',price:280},
 {keys:['douche'],description:'Création ou rénovation de douche',unit:'forfait',price:1850},
 {keys:['salle de bain','sdb'],description:'Rénovation de salle de bain',unit:'forfait',price:5200},
 {keys:['peinture'],description:'Travaux de peinture',unit:'m²',price:32},
 {keys:['placo','cloison'],description:'Création de cloison en plaques de plâtre',unit:'m²',price:68},
];
const clean=(text:string)=>text.trim().replace(/\s+/g,' ');
function createLines(text:string):DocumentLine[]{const lower=text.toLowerCase();const matches=catalog.filter(x=>x.keys.some(k=>lower.includes(k))).map(x=>({id:uid(),description:x.description,quantity:1,unit:x.unit,unit_price_ht:x.price}));return matches.length?matches:[{id:uid(),description:clean(text)||'Prestation à préciser',quantity:1,unit:'forfait',unit_price_ht:0}]}
function titleFrom(text:string){const value=clean(text);return value.length>72?`${value.slice(0,69)}…`:value||'Nouvelle prestation'}

export function AssistantPage(){
 const {clients,missions,quotes,invoices,addQuote,addMissionNote,addMissionTask,convertQuoteToInvoice,addInvoice}=useAppData();
 const navigate=useNavigate(); const [tab,setTab]=useState<'quote'|'report'|'automations'>('quote');
 const [dictation,setDictation]=useState(''); const [listening,setListening]=useState(false); const [clientId,setClientId]=useState(''); const [vat,setVat]=useState(10); const [preview,setPreview]=useState<DocumentLine[]>([]); const [previewTitle,setPreviewTitle]=useState('');
 const [missionId,setMissionId]=useState(''); const [reportText,setReportText]=useState(''); const [message,setMessage]=useState('');
 const acceptedWithoutInvoice=useMemo(()=>quotes.filter(q=>q.status==='accepted'&&!invoices.some(i=>i.quote_id===q.id)),[quotes,invoices]);
 const completedWithoutInvoice=useMemo(()=>missions.filter(m=>m.status==='completed'&&!invoices.some(i=>i.mission_id===m.id)),[missions,invoices]);
 function toggleVoice(setter:(value:string)=>void,current:string){const Ctor=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Ctor){setMessage('La dictée vocale n’est pas disponible dans ce navigateur.');return}const recognition=new Ctor();recognition.lang='fr-FR';recognition.continuous=false;recognition.interimResults=false;recognition.onresult=e=>{const transcript=e.results?.[0]?.[0]?.transcript??'';setter(clean(`${current} ${transcript}`));};recognition.onend=()=>setListening(false);recognition.onerror=()=>{setListening(false);setMessage('La dictée vocale a été interrompue.');};setListening(true);recognition.start();}
 function analyseQuote(){setPreviewTitle(titleFrom(dictation));setPreview(createLines(dictation));setMessage('Proposition générée localement. Vérifie les prix avant de créer le devis.');}
 function createQuote(){if(!preview.length)analyseQuote();const lines=preview.length?preview:createLines(dictation);const quote=addQuote({client_id:clientId||null,mission_id:null,title:previewTitle||titleFrom(dictation),status:'draft',vat_rate:vat,discount_percent:0,lines});navigate(`/quotes/${quote.id}`)}
 function createReport(){const mission=missions.find(m=>m.id===missionId);if(!mission||!clean(reportText)){setMessage('Choisis une intervention et ajoute une description.');return}const report=clean(reportText);addMissionNote(mission.id,`Rapport généré : ${report}`);const lower=report.toLowerCase();const tasks=['Photos avant enregistrées','Travaux réalisés et contrôlés','Zone de travail nettoyée','Client informé des travaux'];tasks.forEach((task,index)=>{if(index<2||lower.includes('termin')||lower.includes('réalis'))addMissionTask(mission.id,task)});setMessage('Rapport et check-list ajoutés à l’intervention.');setReportText('');}
 function invoiceMission(id:string){const mission=missions.find(m=>m.id===id);if(!mission)return;const invoice=addInvoice({client_id:mission.client_id,mission_id:mission.id,quote_id:null,title:mission.title,status:'draft',vat_rate:10,discount_percent:0,lines:[{id:uid(),description:mission.title,quantity:1,unit:'forfait',unit_price_ht:mission.price_ht||0}],due_date:null});navigate(`/invoices/${invoice.id}`)}
 return <><div className="page-title"><div><p className="eyebrow">CLOSERFLOW 2.0</p><h1>Assistant intelligent</h1><p className="muted">Devis, rapports et actions préparés localement, sans envoyer tes données sur Internet.</p></div><Bot/></div>
 <div className="assistant-tabs"><button className={tab==='quote'?'active':''} onClick={()=>setTab('quote')}><FileText/>Devis</button><button className={tab==='report'?'active':''} onClick={()=>setTab('report')}><WandSparkles/>Rapport</button><button className={tab==='automations'?'active':''} onClick={()=>setTab('automations')}><Zap/>Automatisations</button></div>
 {message&&<div className="assistant-message"><Sparkles/>{message}</div>}
 {tab==='quote'&&<section className="assistant-card"><h2>Créer un devis depuis une description</h2><p className="muted">Exemple : « Chez Martin, remplacer un chauffe-eau 200 L et un mitigeur. »</p><div className="voice-field"><textarea rows={5} value={dictation} onChange={e=>setDictation(e.target.value)} placeholder="Décris les travaux…"/><button type="button" onClick={()=>toggleVoice(setDictation,dictation)} aria-label="Dicter">{listening?<MicOff/>:<Mic/>}</button></div><div className="assistant-grid"><label>Client<select value={clientId} onChange={e=>setClientId(e.target.value)}><option value="">Sans client</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company_name||`${c.first_name} ${c.last_name}`}</option>)}</select></label><label>TVA<select value={vat} onChange={e=>setVat(Number(e.target.value))}><option value={0}>0 %</option><option value={5.5}>5,5 %</option><option value={10}>10 %</option><option value={20}>20 %</option></select></label></div><div className="assistant-actions"><button className="secondary" onClick={analyseQuote}><Sparkles/>Analyser</button><button className="primary" onClick={createQuote}><FileText/>Créer le devis</button></div>{preview.length>0&&<div className="ai-preview"><input value={previewTitle} onChange={e=>setPreviewTitle(e.target.value)}/>{preview.map((line,index)=><div key={line.id} className="ai-line"><input value={line.description} onChange={e=>setPreview(rows=>rows.map((x,i)=>i===index?{...x,description:e.target.value}:x))}/><input type="number" min="0" step="0.01" value={line.unit_price_ht} onChange={e=>setPreview(rows=>rows.map((x,i)=>i===index?{...x,unit_price_ht:Number(e.target.value)}:x))}/><span>€ HT</span></div>)}</div>}</section>}
 {tab==='report'&&<section className="assistant-card"><h2>Rédiger un rapport de terrain</h2><label>Intervention<select value={missionId} onChange={e=>setMissionId(e.target.value)}><option value="">Choisir…</option>{missions.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label><div className="voice-field"><textarea rows={7} value={reportText} onChange={e=>setReportText(e.target.value)} placeholder="Décris ce qui a été fait, les contrôles et les remarques client…"/><button type="button" onClick={()=>toggleVoice(setReportText,reportText)}>{listening?<MicOff/>:<Mic/>}</button></div><button className="primary" onClick={createReport}><WandSparkles/>Ajouter le rapport et la check-list</button></section>}
 {tab==='automations'&&<section className="assistant-card"><h2>Actions recommandées</h2><p className="muted">CloserFlow détecte les dossiers prêts pour l’étape suivante. Rien n’est envoyé automatiquement.</p><div className="automation-list">{acceptedWithoutInvoice.map(q=><article key={q.id}><CheckCircle2/><div><strong>{q.number} · {q.title}</strong><small>Devis accepté, facture non créée</small></div><button className="primary small" onClick={()=>{const i=convertQuoteToInvoice(q.id,null);navigate(`/invoices/${i.id}`)}}>Créer la facture</button></article>)}{completedWithoutInvoice.map(m=><article key={m.id}><CheckCircle2/><div><strong>{m.title}</strong><small>Intervention terminée, facture non créée</small></div><button className="primary small" onClick={()=>invoiceMission(m.id)}>Créer la facture</button></article>)}{!acceptedWithoutInvoice.length&&!completedWithoutInvoice.length&&<div className="empty-state"><CheckCircle2/><strong>Tout est à jour</strong><span>Aucune action immédiate détectée.</span></div>}</div></section>}
 </>;
}
