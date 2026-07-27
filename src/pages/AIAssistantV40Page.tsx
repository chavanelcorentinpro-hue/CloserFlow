import {useState} from 'react';
import {Bot, Mic, Volume2} from 'lucide-react';
import {askCloserFlowAI} from '../lib/aiAssistant';
export function AIAssistantV40Page(){
 const [q,setQ]=useState(''); const [r,setR]=useState('');
 return <div className="panel">
 <div className="page-title"><div><p className="eyebrow">CLOSERFLOW 40 · IA</p><h1>Assistant IA</h1><p>Préparation devis, messages clients et analyse chantier.</p></div><Bot/></div>
 <textarea value={q} onChange={e=>setQ(e.target.value)} placeholder="Ex: crée un devis salle de bain 8000€"/>
 <button onClick={async()=>setR((await askCloserFlowAI({action:'quote',prompt:q})).text)}><Mic/>Demander à l'IA</button>
 <p>{r}</p><small><Volume2/> Double appui Volume - : préparation Android native</small>
 </div>
}
