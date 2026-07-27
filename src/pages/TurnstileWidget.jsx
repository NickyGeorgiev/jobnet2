import { useEffect, useRef } from 'react'

export function TurnstileWidget({ onVerify }) {
  const containerRef = useRef(null)
  const widgetId = useRef(null)

  useEffect(() => {
    function renderWidget() {
      if (window.turnstile && containerRef.current && widgetId.current === null) {
        widgetId.current = window.turnstile.render(containerRef.current, {
          sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
          callback: (token) => onVerify(token),
          'expired-callback': () => onVerify(''),
        })
      }
    }

    if (window.turnstile) {
      renderWidget()
    } else {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      script.async = true
      script.onload = renderWidget
      document.body.appendChild(script)
    }

    return () => {
      if (window.turnstile && widgetId.current !== null) {
        window.turnstile.remove(widgetId.current)
        widgetId.current = null
      }
    }
  }, [])

  return <div ref={containerRef} style={{ marginBottom: '1rem' }} />
}