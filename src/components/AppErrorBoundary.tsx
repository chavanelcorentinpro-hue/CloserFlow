import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('CloserFlow startup error', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main style={{ minHeight: '100vh', padding: 24, fontFamily: 'system-ui', background: '#0f172a', color: 'white' }}>
        <h1>CloserFlow n’a pas pu démarrer</h1>
        <p>Une erreur locale a été détectée. Recharge la page après avoir vidé les données du site.</p>
        <pre style={{ whiteSpace: 'pre-wrap', padding: 16, borderRadius: 12, background: '#111827', color: '#fecaca' }}>
          {this.state.error.message}
        </pre>
        <button onClick={() => location.reload()} style={{ padding: '12px 18px', border: 0, borderRadius: 10, fontWeight: 700 }}>
          Recharger
        </button>
      </main>
    );
  }
}
