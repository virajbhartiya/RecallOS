import { storeMemory } from './blockchain';

export async function anchorMetaSummary(text: string): Promise<string> {
  // Minimal adapter: use existing blockchain service
  try {
    // Create a simple hash of the text for anchoring
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(text).digest('hex');
    
    // Store the memory on blockchain (this will create a transaction hash)
    const result = await storeMemory(
      hash,
      text, // Use the text as URL
      Math.floor(Date.now() / 1000)
    );
    
    return result?.txHash || hash;
  } catch (error) {
    console.error('Error anchoring meta summary:', error);
    return '';
  }
}


