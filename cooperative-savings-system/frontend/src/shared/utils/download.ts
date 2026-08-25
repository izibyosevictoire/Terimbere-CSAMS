/**
 * Parse a Content-Disposition header value into a download filename.
 * Supports `filename="..."` and RFC 5987 `filename*=UTF-8''...`.
 */
export function parseContentDispositionFilename(
  header: string | null | undefined,
  fallback: string,
): string {
  if (!header?.trim()) return fallback

  const utf8Match = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim().replace(/^["']|["']$/g, ''))
    } catch {
      return utf8Match[1].trim().replace(/^["']|["']$/g, '') || fallback
    }
  }

  const plainMatch = /filename\s*=\s*("([^"]+)"|([^;]+))/i.exec(header)
  if (plainMatch) {
    const name = (plainMatch[2] ?? plainMatch[3] ?? '').trim()
    if (name) return name
  }

  return fallback
}

/** Trigger a browser file download from a Blob via a temporary object URL. */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

/** If the blob is JSON (API error wrapped as blob), parse and throw its message. */
export async function throwIfBlobError(blob: Blob, fallback = 'Download failed'): Promise<void> {
  const peek = await blob.slice(0, 8).text()
  if (peek.startsWith('%PDF')) return
  const looksJson =
    (blob.type && blob.type.includes('application/json')) || peek.trimStart().startsWith('{')
  if (!looksJson) return
  const text = await blob.text()
  let message = fallback
  try {
    const json = JSON.parse(text) as { message?: string; fieldErrors?: Array<{ message?: string }> }
    message = json.fieldErrors?.find((item) => item.message)?.message || json.message || fallback
  } catch {
    // keep fallback
  }
  throw new Error(message)
}
