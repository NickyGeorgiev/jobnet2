import { useEffect } from 'react'

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — Jobstate` : 'Jobstate — Съвременна платформа за търсене на работа'
  }, [title])
}