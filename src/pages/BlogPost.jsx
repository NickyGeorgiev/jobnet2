import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useDocumentTitle } from '../useDocumentTitle'
import './BlogList.css'

export function BlogPost() {
  const { slug } = useParams()
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

  if (loading) return <div style={{ padding: '2rem' }}>Зареждане...</div>

  if (!post) {
    return (
      <div className="blog-post-shell" style={{ textAlign: 'center' }}>
        <p>Статията не е намерена.</p>
        <Link to="/blog" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>Обратно към блога</Link>
      </div>
    )
  }

  return (
    <div className="blog-post-shell">
      <Link to="/blog" style={{ color: 'var(--color-teal)', fontSize: '0.85rem', textDecoration: 'none' }}>← Обратно към блога</Link>

      {post.cover_image_url && <img src={post.cover_image_url} alt={post.title} className="blog-post-cover" style={{ marginTop: '1rem' }} />}

      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '1.5rem' }}>
        {new Date(post.published_at).toLocaleDateString('bg-BG')}
      </p>
      <h1 className="blog-post-title">{post.title}</h1>

      <div className="blog-post-body" dangerouslySetInnerHTML={{ __html: post.content }} />
    </div>
  )
}