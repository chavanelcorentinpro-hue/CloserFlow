import { Fingerprint, LockKeyhole, ShieldCheck, Smartphone, BadgeCheck } from 'lucide-react';
import { BUILD_FINGERPRINT_V58 } from '../lib/commercialSecurityV58';
export function CommercialSecurityV58Page(){
  return <>
    <div className="page-title"><div><p className="eyebrow">CLOSERFLOW 58 · COMMERCIAL SECURITY</p><h1>Protection avant vente</h1><p>Le build commercial réduit l’exposition du code et garde les fonctions premium liées au serveur.</p></div><ShieldCheck/></div>
    <section className="v58-security-grid">
      <article><Smartphone/><div><strong>APK release</strong><span>R8 + shrinkResources + debug désactivé</span></div><BadgeCheck/></article>
      <article><LockKeyhole/><div><strong>Réseau</strong><span>HTTP non chiffré interdit</span></div><BadgeCheck/></article>
      <article><ShieldCheck/><div><strong>Licence</strong><span>Vérification côté serveur</span></div><BadgeCheck/></article>
      <article><Fingerprint/><div><strong>Empreinte build</strong><span>{BUILD_FINGERPRINT_V58.slice(0,16)}…</span></div><BadgeCheck/></article>
    </section>
  </>;
}
