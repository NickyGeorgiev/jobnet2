import { useEffect } from 'react'

export function useSeo({ title, description } = {}) {
  useEffect(() => {
    document.title = title ? `${title} — Jobstate: намери следващата си работа` : 'Jobstate — Открий нови възможности'

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

export const useDocumentTitle = (title) => useSeo({ title })