import { useState } from 'react'
import { en } from '../i18n/en'

export function ShareLinkButton() {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setStatus('copied')
    } catch {
      // Clipboard access can be denied (permissions policy, insecure context, some sandboxes).
      setStatus('failed')
    }
    setTimeout(() => setStatus('idle'), 1500)
  }

  const label =
    status === 'copied' ? en.share.linkCopied : status === 'failed' ? en.share.copyFailed : en.share.copyLink

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="border px-3 py-1.5 text-sm cursor-pointer"
      style={{ borderColor: 'var(--color-brass)', color: 'var(--color-brass)' }}
    >
      {label}
    </button>
  )
}
