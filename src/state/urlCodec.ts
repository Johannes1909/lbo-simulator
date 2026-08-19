import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { DealInputs } from '../model/types'

/**
 * The entire deal state lives in the URL — no backend, no database. A link
 * IS the case. lz-string's URI-safe encoding already avoids characters that
 * need escaping in a URL, so no separate base64url step is needed on top.
 */
export function encodeDealState(inputs: DealInputs): string {
  return compressToEncodedURIComponent(JSON.stringify(inputs))
}

export function decodeDealState(encoded: string): DealInputs | null {
  try {
    const json = decompressFromEncodedURIComponent(encoded)
    if (!json) return null
    return JSON.parse(json) as DealInputs
  } catch {
    return null
  }
}
