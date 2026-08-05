import { useEffect } from 'react'

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — Jobstate` : 'Jobstate — Обратна платформа за търсене на работа'
  }, [title])
}