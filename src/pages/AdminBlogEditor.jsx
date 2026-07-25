import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../AuthContext'
import { useToast } from './Toast'
import './AdminBlog.css'

function slugify(text) {
  const map = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sht',ъ:'a',ь:'y',ю:'yu',я:'ya' }
  return text.toLowerCase().split('').map((ch) => map[ch] || ch).join('')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-')
}

export function AdminBlogEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const { showToast } = useToast()
  const isNew = id === 'new'

  const [topic, setTopic] = useState('')
  const [generating, setGenerating] = useState(false)
  const [formData, setFormData] = useState({
    title: '', slug: '', excerpt: '', content: '', cover_image_url: '', meta_description: '', status: 'draft',
  })
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)

  useEffect(() => {
    if (!isNew) loadPost()
  }, [id])

  async function loadPost() {
    const { data } = await supabase.from('blog_posts').select('*').eq('id', id).single()
    if (data) setFormData(data)
    setLoading(false)
  }

  async function handleGenerate() {
    if (!topic.trim()) {
      showToast('Въведи тема за статията', 'error')
      return
    }
    setGenerating(true)

    const { data, error } = await supabase.functions.invoke('generate-blog-draft', { body: { topic } })

    if (error || data?.error) {
      showToast(data?.error || error.message, 'error')
    } else {
      setFormData((prev) => ({
        ...prev,
        title: data.title,
        slug: slugify(data.title),
        excerpt: data.excerpt,
        content: data.content,
        meta_description: data.excerpt,
      }))
      showToast('Чернова генерирана — прегледай и редактирай преди публикуване', 'success')
    }
    setGenerating(false)
  }

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  function handleTitleChange(e) {
    setFormData({ ...formData, title: e.target.value, slug: slugify(e.target.value) })
  }

  async function handleCoverUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploadingCover(true)

    const filePath = `${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage.from('blog-images').upload(filePath, file)

    if (uploadError) {
      showToast('Грешка при качване: ' + uploadError.message, 'error')
      setUploadingCover(false)
      return
    }

    const { data } = supabase.storage.from('blog-images').getPublicUrl(filePath)
    setFormData((prev) => ({ ...prev, cover_image_url: data.publicUrl }))
    setUploadingCover(false)
  }

  async function handleSave(newStatus) {
    setSaving(true)

    const payload = {
      ...formData,
      status: newStatus,
      author_id: session.user.id,
      published_at: newStatus === 'published' && !formData.published_at ? new Date().toISOString() : formData.published_at,
    }

    let result
    if (isNew) {
      result = await supabase.from('blog_posts').insert(payload).select().single()
    } else {
      result = await supabase.from('blog_posts').update(payload).eq('id', id).select().single()
    }

    if (result.error) {
      showToast('Грешка: ' + result.error.message, 'error')
    } else {
      showToast(newStatus === 'published' ? 'Публикувано!' : 'Записано като чернова', 'success')
      navigate('/admin-blog')
    }
    setSaving(false)
  }

  if (loading) return <div style={{ padding: '2rem' }}>Зареждане...</div>

  return (
    <div className="cv-form-shell">
      <h2 className="cv-form-title">{isNew ? 'Нова статия' : 'Редакция на статия'}</h2>

      {isNew && (
        <div className="cv-form-section">
          <h3 className="cv-form-section-title">🤖 AI чернова</h3>
          <div className="field">
            <label>Тема на статията</label>
            <input className="input" value={topic} onChange={(e) => setTopic(e.target.value)}
              placeholder="напр. Как да напишеш CV, което грабва вниманието" />
          </div>
          <button type="button" className="btn-primary" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Генерирам...' : 'Генерирай чернова'}
          </button>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.75rem' }}>
            Прегледай и редактирай генерирания текст, преди да публикуваш — не публикувай суров AI текст.
          </p>
        </div>
      )}

      <div className="cv-form-section">
        <div className="field">
          <label>Корицова снимка</label><br />
          {formData.cover_image_url && (
            <img src={formData.cover_image_url} alt="корица" style={{ width: '200px', borderRadius: '8px', display: 'block', marginBottom: '0.5rem' }} />
          )}
          <input type="file" accept="image/*" onChange={handleCoverUpload} />
          {uploadingCover && <p style={{ fontSize: '0.8rem' }}>Качвам...</p>}
        </div>

        <div className="field">
          <label>Заглавие</label>
          <input className="input" value={formData.title} onChange={handleTitleChange} />
        </div>

        <div className="field">
          <label>URL адрес (slug)</label>
          <input className="input" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} />
        </div>

        <div className="field">
          <label>Кратко резюме</label>
          <textarea className="input" name="excerpt" value={formData.excerpt} onChange={handleChange} rows={2} />
        </div>

        <div className="field">
          <label>Съдържание (HTML)</label>
          <textarea className="input" name="content" value={formData.content} onChange={handleChange} rows={16} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }} />
        </div>

        <div className="field">
          <label>SEO мета описание</label>
          <input className="input" name="meta_description" value={formData.meta_description} onChange={handleChange} />
        </div>
      </div>

      <div className="blog-editor-toolbar">
        <button className="btn-secondary" onClick={() => handleSave('draft')} disabled={saving}>
          Запази като чернова
        </button>
        <button className="btn-primary" onClick={() => handleSave('published')} disabled={saving}>
          {saving ? 'Записвам...' : 'Публикувай'}
        </button>
      </div>
    </div>
  )
}