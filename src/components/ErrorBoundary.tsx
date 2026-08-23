import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, Activity, RotateCcw } from 'lucide-react';
import { logTelemetry } from '../utils/auditTelemetry';

interface Props {
  children: ReactNode;
  onOpenTelemetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log directly to the Telemetry Engine
    logTelemetry(
      'error',
      `Exceção React capturada: ${error.name} - ${error.message}`,
      {
        componentStack: errorInfo.componentStack,
        errorName: error.name,
        errorMessage: error.message
      },
      'ErrorBoundary',
      error.stack
    );

    console.error('Telumak ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] w-full flex items-center justify-center p-6 bg-[#0c0d0f] border border-rose-500/30 text-white my-4 font-sans">
          <div className="max-w-xl w-full space-y-4 text-center">
            
            <div className="w-14 h-14 mx-auto bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <AlertOctagon className="h-7 w-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-black uppercase tracking-wider text-white">
                Ocorreu uma Falha nesta Seção do Grimório
              </h2>
              <p className="text-xs text-white/60">
                O erro foi registrado em tempo real no monitor de telemetria.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-black/80 border border-rose-500/20 text-left font-mono text-xs text-rose-300 overflow-x-auto">
                <p className="font-bold">{this.state.error.name}: {this.state.error.message}</p>
                {this.state.error.stack && (
                  <pre className="mt-2 text-[10px] text-white/40 overflow-x-auto whitespace-pre-wrap max-h-32 custom-scroll">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 transition shadow"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Tentar Novamente</span>
              </button>

              {this.props.onOpenTelemetry && (
                <button
                  type="button"
                  onClick={this.props.onOpenTelemetry}
                  className="px-4 py-2 bg-[#1b1e22] hover:bg-[#252a30] text-rose-300 border border-rose-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition shadow"
                >
                  <Activity className="h-3.5 w-3.5" />
                  <span>Ver na Janela de Telemetria</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 transition"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Recarregar Portal</span>
              </button>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
