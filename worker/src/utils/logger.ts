export function logInfo(label: string, data?: unknown): void {
  // TODO: replace with a structured logger if desired
  console.info(`[gupta-chat][${label}]`, data ?? '');
}

export function logWarn(label: string, data?: unknown): void {
  console.warn(`[gupta-chat][${label}]`, data ?? '');
}

export function logError(label: string, data?: unknown): void {
  console.error(`[gupta-chat][${label}]`, data ?? '');
}
