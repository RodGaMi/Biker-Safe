import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught application error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  public render() {
    if (this.state.hasError) {
      let parsedError: { error?: string; operationType?: string; path?: string } | null = null;
      try {
        parsedError = JSON.parse(this.state.errorMessage);
      } catch {
        parsedError = null;
      }

      return (
        <div className="min-h-screen bg-[#0B0C0E] text-zinc-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-[#14161A] border border-zinc-800 rounded-2xl p-8">
            <div className="flex items-center gap-3 text-orange-500 mb-4">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-bold text-white">
                Alerta de Conexión o Seguridad
              </h2>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              {parsedError?.error
                ? `No se pudo completar la operación (${parsedError.operationType || 'acceso'}): ${parsedError.error}`
                : this.state.errorMessage || 'Ocurrió un error inesperado al procesar la solicitud.'}
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-black text-sm font-bold rounded-lg hover:bg-orange-400 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
