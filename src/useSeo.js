import { useEffect } from 'react'

export function useSeo({ title, description } = {}) {
  useEffect(() => {
    document.title = title ? `${title} — Jobstate` : 'Jobstate — Работата те намира'

    if (description) {
      let tag = document.querySelector('meta[name="description"]')
      if (!tag) {
        tag = document.createElement('meta')
        tag.name = 'description'
        document.head.appendChild(tag)
      }
      tag.content = description
    }
  }, [title, description])
}

// Пазим старото име като алиас, за да не се налага да пипаме всеки файл наведнъж
export const useDocumentTitle = (title) => useSeo({ title })