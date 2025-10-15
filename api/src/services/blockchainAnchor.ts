import { nexusService } from './blockchain';

export async function anchorMetaSummary(text: string): Promise<string> {
  // Minimal adapter: reuse existing blockchain service if available
  try {
    const res = await nexusService.anchorText(text);
    return res?.hash || res?.txHash || '';
  } catch {
    return '';
  }
}


