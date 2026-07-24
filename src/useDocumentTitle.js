import { useEffect } from 'react'

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — Jobstate` : 'Jobstate — Работата те намира'
  }, [title])
}