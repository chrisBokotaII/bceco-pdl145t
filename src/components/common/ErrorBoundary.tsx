import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'Erreur inattendue de l’application.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('BCECO App ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      let displayDetail = this.state.errorMessage;
      try {
        const parsed = JSON.parse(this.state.errorMessage);
        if (parsed?.operationType && parsed?.error) {
          displayDetail = `Opération Firestore (${parsed.operationType} sur ${parsed.path || 'collection'}) refusée : ${parsed.error}`;
        }
      } catch {
        // non-JSON message
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-700">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h1 className="text-lg font-semibold text-slate-900">
                Incident technique détecté
              </h1>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Une erreur a interrompu l’affichage de cette vue. Vos brouillons enregistrés localement dans IndexedDB restent intacts.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs font-mono text-slate-700 break-words">
              {displayDetail}
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F2544] text-white text-sm font-medium rounded-md hover:bg-[#16325B] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Recharger l’application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
