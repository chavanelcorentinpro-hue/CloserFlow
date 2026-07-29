export const COMMERCIAL_RELEASE_V61 = {
  version: '61.0.0',
  plans: [
    { id:'starter', label:'Starter', monthly:19.90, description:'Devis, factures, clients et suivi essentiel.' },
    { id:'pro', label:'Pro', monthly:39.90, description:'Automatisations, fonctions avancées et outils de rentabilité.' }
  ],
  requirements: {
    secureApi: true,
    serverLicensing: true,
    isolatedWorkspace: true,
    subscriptionRequired: true
  }
} as const;

export function productionReadinessV61(apiUrl:string, token:string){
  const secure = /^https:\/\//i.test(apiUrl);
  return {
    secureApi: secure,
    authenticated: Boolean(token && token !== 'local-device'),
    ready: secure && Boolean(token && token !== 'local-device')
  };
}
