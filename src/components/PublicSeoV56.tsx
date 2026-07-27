import { useEffect } from 'react';

export function PublicSeoV56(){
  useEffect(()=>{
    document.title='CloserFlow — Devis, chantiers, factures et stock pour artisans';
    const set=(name:string,content:string)=>{
      let el=document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement|null;
      if(!el){el=document.createElement('meta');el.name=name;document.head.appendChild(el)}
      el.content=content;
    };
    set('description','CloserFlow réunit devis, factures, chantiers, stock, fournisseurs, rentabilité et assistant IA dans une seule application pour artisans.');
    set('robots','index,follow');
    set('theme-color','#111111');

    let canonical=document.querySelector('link[rel="canonical"]') as HTMLLinkElement|null;
    if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical)}
    canonical.href=window.location.origin+'/welcome';
  },[]);
  return null;
}
