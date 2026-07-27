export const LAUNCH_MODE = {
  paymentsEnabled: false,
  plans: [
    {id:'solo', name:'Solo', price:19},
    {id:'team', name:'Équipe', price:49},
    {id:'pro', name:'Pro', price:99},
  ],
  mode:'beta'
} as const;
