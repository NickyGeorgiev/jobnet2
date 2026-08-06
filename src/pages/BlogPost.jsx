import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useDocumentTitle } from '../useDocumentTitle'
import { useToast } from './Toast'
import './BlogList.css'

export function BlogPost() {
  const { slug } = useParams()
  const { showToast } = useToast()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)

  useDocumentTitle(post?.title || 'Блог')

  useEffect(() => {
    async function loadPost() {
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single()
      setPost(data)
      setLoading(false)
    }
    loadPost()
  }, [slug])

  useEffect(() => {
    if (post?.meta_description) {
      let tag = document.querySelector('meta[name="description"]')
      if (!tag) {
        tag = document.createElement('meta')
        tag.name = 'description'
        document.head.appendChild(tag)
      }
      tag.content = post.meta_description
    }
  }, [post])

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      showToast('Линкът е копиран!', 'success')
    } catch {
      showToast('Неуспешно копиране!', 'error')
    }
  }

  if (loading) return <div style={{ padding: '2rem' }}>Зареждане...</div>

  if (!post) {
    return (
      <div className="blog-post-shell" style={{ textAlign: 'center' }}>
        <p>Статията не е намерена.</p>
        <Link to="/blog" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>Обратно към блога</Link>
      </div>
    )
  }

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.excerpt,
    "image": post.cover_image_url || "https://jobstate.net/og-image.jpg",
    "datePublished": post.published_at,
    "author": { "@type": "Organization", "name": "Jobstate" },
    "publisher": { "@type": "Organization", "name": "Jobstate", "logo": { "@type": "ImageObject", "url": "https://jobstate.net/favicon.png" } },
  }

  return (
    <div className="blog-post-shell">
      <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
      <Link to="/blog" style={{ color: 'var(--color-teal)', fontSize: '0.85rem', textDecoration: 'none' }}>← Обратно към блога</Link>

      {post.cover_image_url && <img src={post.cover_image_url} alt={post.title} className="blog-post-cover" style={{ marginTop: '1rem' }} />}

      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '1.5rem' }}>
        {new Date(post.published_at).toLocaleDateString('bg-BG')}
      </p>
      <h1 className="blog-post-title">{post.title}</h1>

      <div className="blog-post-body" dangerouslySetInnerHTML={{ __html: post.content }} />

      <div className="share-sidebar">
        <span className="share-label">Сподели:</span>

        <a
          className="share-btn"
          style={{ background: '#1877F2' }}
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Сподели във Facebook"
        >
          <svg viewBox="0 0 24 24" fill="white">
            <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94Z" />
          </svg>
        </a>

        <a
          className="share-btn"
          style={{ background: '#0A66C2' }}
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Сподели в LinkedIn"
        >
          <svg viewBox="0 0 24 24" fill="white">
            <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z" />
          </svg>
        </a>

        <a
          className="share-btn"
          style={{ background: '#7360F2' }}
          href={`viber://forward?text=${encodeURIComponent(post.title + ' — ' + window.location.href)}`}
          aria-label="Сподели във Viber"
        >
          <img src="https://cdn.simpleicons.org/viber/ffffff" alt="" width="20" height="20" />
        </a>

        <button
          className="share-btn"
          style={{
            background: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border)'
          }}
          onClick={handleCopyLink}
          aria-label="Копирай линк"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ color: 'var(--color-text)' }}
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </button>
      </div>
    </div>
  )
}