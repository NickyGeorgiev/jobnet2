import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useDocumentTitle } from '../useDocumentTitle'
import './BlogList.css'

export function BlogList() {
  useDocumentTitle('Блог')
  const [posts, setPosts] = useState(null)

  useEffect(() => {
    async function loadPosts() {
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
      setPosts(data || [])
    }
    loadPosts()
  }, [])

  if (posts === null) return <div style={{ padding: '2rem' }}>Зареждане...</div>

  return (
    <div className="blog-list-shell">
      <h1 style={{ fontFamily: 'var(--font-display)' }}>Блог</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>
        Съвети за търсене на работа, пазар на труда и кариерно развитие.
        {' '}<a href="/rss.xml" style={{ color: 'var(--color-teal)' }}>RSS</a>
      </p>

      {posts.length === 0 && <p style={{ color: 'var(--color-text-muted)', marginTop: '2rem' }}>Очаквайте скоро първите статии.</p>}

      <div className="blog-grid">
        {posts.map((post) => (
          <Link key={post.id} to={`/blog/${post.slug}`} className="blog-card">
            {post.cover_image_url && <img src={post.cover_image_url} alt={post.title} className="blog-card-image" />}
            <div className="blog-card-body">
              <span className="blog-card-date">{new Date(post.published_at).toLocaleDateString('bg-BG')}</span>
              <h3 className="blog-card-title">{post.title}</h3>
              <p className="blog-card-excerpt">{post.excerpt}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}