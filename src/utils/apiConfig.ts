/**
 * Helper para resolver a URL base das requisições de API.
 * Se VITE_API_URL estiver definido, utiliza seu valor.
 * Caso contrário, utiliza rota relativa ('/api/...'), direcionando para o próprio host da aplicação.
 */
export const getApiUrl = (endpoint: string): string => {
  const base = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).trim().replace(/\/$/, '') : '';
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${cleanEndpoint}`;
};
