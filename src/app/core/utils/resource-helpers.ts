// src/app/core/utils/resource-helpers.ts

export function toQuery(params: { [key: string]: any }): string {
  const query = Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null)
    .map(key => {
      const value = params[key];
      if (Array.isArray(value)) {
        return value.map(item => `${encodeURIComponent(key)}=${encodeURIComponent(item)}`).join('&');
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .filter(Boolean) // Eliminar cadenas vacías resultantes de arrays vacíos
    .join('&');
  return query ? `?${query}` : '';
}
