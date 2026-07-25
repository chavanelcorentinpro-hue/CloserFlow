function csvCell(value:unknown){
 const text=String(value??'').replace(/"/g,'""');
 return `"${text}"`;
}
export function downloadCsv(filename:string,headers:string[],rows:unknown[][]){
 const content='\ufeff'+[headers,...rows].map(row=>row.map(csvCell).join(';')).join('\n');
 const blob=new Blob([content],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob); const anchor=document.createElement('a');
 anchor.href=url; anchor.download=filename; anchor.click(); URL.revokeObjectURL(url);
}
