import { Component, type ErrorInfo, type ReactNode } from 'react';
export class ProductionErrorBoundary extends Component<{children:ReactNode},{error:string|null}>{
 state={error:null as string|null};
 static getDerivedStateFromError(error:unknown){return {error:error instanceof Error?error.message:'Erreur inattendue'};}
 componentDidCatch(error:unknown,info:ErrorInfo){console.error('[CloserFlow] UI crash',error,info.componentStack);}
 render(){if(this.state.error)return <main className="production-crash"><section className="panel"><p className="eyebrow">CLOSERFLOW · MODE SÉCURISÉ</p><h1>Une erreur a été interceptée</h1><p>{this.state.error}</p><button className="primary" onClick={()=>location.reload()}>Recharger l'application</button></section></main>;return this.props.children;}
}
