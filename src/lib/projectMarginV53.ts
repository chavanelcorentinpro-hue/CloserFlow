export type ProjectMarginInputV53 = {
  projectId:string;
  projectTitle:string;
  revenue:number;
  materialCost:number;
  laborHours:number;
  laborHourlyCost:number;
  travelCost:number;
  subcontractingCost:number;
  otherCosts:number;
};

export type ProjectMarginV53 = ProjectMarginInputV53 & {
  laborCost:number;
  totalCost:number;
  grossProfit:number;
  marginPercent:number;
  revenuePerHour:number;
  status:'healthy'|'watch'|'critical';
  warnings:string[];
};

export function calculateProjectMargin(input:ProjectMarginInputV53):ProjectMarginV53{
  const laborCost=Math.max(0,input.laborHours)*Math.max(0,input.laborHourlyCost);
  const totalCost=[
    input.materialCost,laborCost,input.travelCost,
    input.subcontractingCost,input.otherCosts
  ].reduce((s,v)=>s+Math.max(0,Number(v||0)),0);

  const grossProfit=input.revenue-totalCost;
  const marginPercent=input.revenue>0 ? grossProfit/input.revenue*100 : 0;
  const revenuePerHour=input.laborHours>0 ? input.revenue/input.laborHours : 0;
  const warnings:string[]=[];

  if(input.revenue<=0)warnings.push('Aucun chiffre d’affaires reconnu pour ce chantier.');
  if(marginPercent<10)warnings.push('Marge inférieure à 10 %.');
  else if(marginPercent<25)warnings.push('Marge à surveiller : inférieure à 25 %.');
  if(input.materialCost>input.revenue*0.5&&input.revenue>0)warnings.push('Le coût matière dépasse 50 % du chiffre d’affaires.');
  if(laborCost>input.revenue*0.45&&input.revenue>0)warnings.push('Le coût de main-d’œuvre dépasse 45 % du chiffre d’affaires.');
  if(input.subcontractingCost>input.revenue*0.35&&input.revenue>0)warnings.push('Sous-traitance élevée par rapport au CA.');

  const status:ProjectMarginV53['status'] =
    marginPercent<10 || grossProfit<0 ? 'critical' :
    marginPercent<25 ? 'watch' : 'healthy';

  return {
    ...input,laborCost,totalCost,grossProfit,marginPercent,
    revenuePerHour,status,warnings
  };
}

export function portfolioSummary(rows:ProjectMarginV53[]){
  const revenue=rows.reduce((s,r)=>s+r.revenue,0);
  const cost=rows.reduce((s,r)=>s+r.totalCost,0);
  const profit=revenue-cost;
  const margin=revenue>0?profit/revenue*100:0;
  return {
    revenue,cost,profit,margin,
    critical:rows.filter(r=>r.status==='critical').length,
    watch:rows.filter(r=>r.status==='watch').length,
    healthy:rows.filter(r=>r.status==='healthy').length
  };
}
