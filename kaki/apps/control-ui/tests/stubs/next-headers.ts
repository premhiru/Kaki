export let values = new Map<string, string>();

export function setHeaderValues(next: Record<string, string>): void {
  values = new Map(Object.entries(next));
}

export async function headers() {
  return { get: (name: string) => values.get(name) ?? null };
}
