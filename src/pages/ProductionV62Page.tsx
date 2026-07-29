import { useEffect,useState } from 'react';
import { Database,Globe2,Server,ShieldCheck,TriangleAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchProductionHealthV62,type ProductionHealthV62 } from '../lib/productionV62';
export function ProductionV62Page(){
 const {apiUrl}=useAuth(); const [health,setHealth]=useState<ProductionHealthV62|null>(null); const [error,setError]=useState('');
 useEffect(()=>{fetchProductionHealthV62(apiUrl).then(setHealth).catch(e=>setError(e instanceof Error?e.message:'API indisponible'))},[apiUrl]);
 return <>
  <div className="page-title"><div><p className="eyebrow">CLOSERFLOW 62 · PRODUCTION FOUNDATION</p><h1>Infrastructure de production</h1><p>Contrôle de la persistance et du confinement du backend.</p></div><Server/></div>
  <section className="v62-grid">
   <article><Database/><div><strong>Données persistantes</strong><span>{health?.checks?.persistentDataDir?'Configurées':'À configurer'}</span></div></article>
   <article><Globe2/><div><strong>Origines autorisées</strong><span>{health?.checks?.restrictedOrigins?'Restreintes':'À verrouiller'}</span></div></article>
   <article><ShieldCheck/><div><strong>Backend</strong><span>{health?.ready?'Prêt selon V62':'Non prêt'}</span></div></article>
  </section>
  {error&&<div className="notice"><TriangleAlert/><span>{error}</span></div>}
 </>;
}
