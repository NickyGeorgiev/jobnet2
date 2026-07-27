import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useToast } from './Toast'
import './AdminBlog.css'

export function AdminBlog() {
  const { showToast } = useToast()
  const [posts, setPosts] = useState(null)

  useEffect(() => {
    loadPosts()
  }, [])

  async function loadPosts() {
    const { data } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false })
    setPosts(data || [])
  }

  async function handleDelete(id) {
    if (!confirm('Сигурни ли сте, че искате да изтриете тази статия?')) return
    const { error } = await supabase.from('blog_posts').delete().eq('id', id)
    if (error) {
      showToast('Грешка: ' + error.message, 'error')
    } else {
      showToast('Статията е изтрита', 'success')
      loadPosts()
    }
  }

  if (posts === null) return <div style={{ padding: '2rem' }}>Зареждане...</div>

  return (
    <div className="dashboard-shell">
      <div className="dashboard-header" style={{ justifyContent: 'space-between', display: 'flex', width: '100%' }}>
        <div>
          <p className="dashboard-eyebrow">Администрация</p>
          <h1 className="dashboard-title">Блог статии</h1>
        </div>
        <Link to="/admin-blog/new" className="btn-primary" style={{ textDecoration: 'none' }}>
          + Нова статия
        </Link>
      </div>

      <div className="blog-admin-list">
        {posts.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>Няма създадени статии още.</p>}

        {posts.map((post) => (
          <div key={post.id} className="blog-admin-row">
            <div>
              <p className="blog-admin-row-title">
                <span className={`blog-status-badge blog-status-badge--${post.status}`}>
                  {post.status === 'published' ? 'Публикувано' : 'Чернова'}
                </span>
                {post.title}
              </p>
              <p className="blog-admin-row-meta">/{post.slug}</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link to={`/admin-blog/${post.id}`} className="btn-secondary" style={{ textDecoration: 'none' }}>Редактирай</Link>
              <button className="btn-text-danger" onClick={() => handleDelete(post.id)}>Изтрий</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}