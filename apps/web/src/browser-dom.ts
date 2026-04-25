export function updateText(selector: string, value: string): void {
  document.querySelector<HTMLElement>(selector)!.textContent = value;
}

export function readValue(selector: string, fallback: string): string {
  return document.querySelector<InputElement>(selector)?.value || fallback;
}

export function writeValue(selector: string, value: string): void {
  const element = document.querySelector<InputElement>(selector);

  if (element) {
    element.value = value;
  }
}

export function readChecked(selector: string): boolean {
  return document.querySelector<HTMLInputElement>(selector)?.checked ?? false;
}

export function readPositiveInteger(selector: string, fallback: number): number {
  const value = Number(readValue(selector, String(fallback)));

  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export function readNonNegativeInteger(selector: string, fallback: number): number {
  const value = Number(readValue(selector, String(fallback)));

  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

export function readError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

type InputElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
