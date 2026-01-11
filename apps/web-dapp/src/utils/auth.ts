export async function requestAuthentication(promptMessage = 'Authenticate to reveal sensitive information'): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  return window.confirm(promptMessage);
}

export function logRevealEvent(label: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = window.localStorage.getItem('noctura_reveal_audit');
    const events = existing ? JSON.parse(existing) as Array<{ label: string; timestamp: number }> : [];
    events.push({ label, timestamp: Date.now() });
    window.localStorage.setItem('noctura_reveal_audit', JSON.stringify(events.slice(-50)));
  } catch (error) {
    console.warn('Failed to persist reveal audit event', error);
  }
}
