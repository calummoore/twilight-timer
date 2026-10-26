import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { joinLink } from '../../model/routes'

/** How long Copy link shows that it copied. */
const COPIED_MS = 2000

const COPY_LABELS = {
  ready: 'Copy link',
  copied: '✓ Copied',
  failed: 'Copy failed · try again',
} as const

type CopyState = keyof typeof COPY_LABELS

/**
 * The QR code, the join code, and the join link of a game, for a new device.
 * The link opens in a new tab, so that this screen stays open.
 */
export function JoinCode({ code }: { code: string }) {
  const link = joinLink(location.origin, code)
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="qr" style={{ margin: '0 auto' }}>
        <QRCodeSVG value={link.url} title={`Join link of game ${code}`} />
      </div>
      <div
        style={{
          fontSize: 10.5,
          letterSpacing: '.18em',
          textTransform: 'uppercase',
          color: 'var(--faint)',
          marginTop: 22,
        }}
      >
        Join code
      </div>
      <div className="joincode num">{code}</div>
      <div className="joinlink">
        Scan the code, or open{' '}
        <a href={link.url} target="_blank" rel="noreferrer">
          {link.text}
        </a>
      </div>
      <CopyLink url={link.url} />
    </div>
  )
}

/**
 * Puts the link on the clipboard, and says so for a moment. A page without
 * the clipboard, such as one over plain http, shows no button. Its link can
 * still be selected and copied.
 */
function CopyLink({ url }: { url: string }) {
  const [state, setState] = useState<CopyState>('ready')
  useEffect(() => {
    if (state !== 'copied') return
    const id = setTimeout(() => setState('ready'), COPIED_MS)
    return () => clearTimeout(id)
  }, [state])

  if (!('clipboard' in navigator)) return null
  const copy = () => {
    navigator.clipboard.writeText(url).then(
      () => setState('copied'),
      () => setState('failed'),
    )
  }
  const tone = state === 'copied' ? 'done' : state === 'failed' ? 'warnish' : ''
  return (
    <button className={`ibtn copy ${tone}`} aria-live="polite" onClick={copy}>
      {COPY_LABELS[state]}
    </button>
  )
}
