import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { sectors } from '../data/sectors'
import { allCities } from '../data/citiesByRegion'
import { useToast } from './Toast'
import { BuyCreditsModal } from './BuyCreditsModal'
import { useTierOptions } from '../useTierOptions'
import stateCreditSvg from '../assets/state-credit.svg';
import { ImageCropperModal } from './ImageCropperModal'
import { SectorSelect } from './SectorSelect'
import './JobListings.css'

const TIER_DESCRIPTIONS = { diamond: 'Най-отгоре', platinum: 'След Diamond', gold: 'След Platinum', silver: 'След Gold' }
const FREE_TIER = { value: 'free', label: 'Безплатна', price: 0, rank: 0, description: 'Най-отдолу', priceId: null }

const LEVEL_OPTIONS = [
  'Ниво работници',
  'Ниво експерти/специалисти',
  'Средно или ниско управленско ниво',
  'Висш мениджмънт',
]

const DURATION_OPTIONS = [
  'На пълен работен ден (8ч.)',
  'На непълен работен ден (4,6ч./почасово)',
  'Стажант/Freelancer',
]

const INITIAL_FORM_DATA = {
  title: '',
  description: '',
  sector: '',
  level: '',
  duration: '',
  city: '',
  salary: '',
  salary_max: '',
  salary_visible: true,
  application_mode: 'platform',
  external_url: '',
  published_at: null,
  expires_at: null,
  tier: 'free',
  tier_rank: 0,
  post_to_facebook: true,
  banner_url: '',
  slug: '',
}

// ============================================================
// SLUG GENERATION (кирилица -> латиница, за четими и стабилни
// публични URL-и на обявите). Генерира се САМО веднъж, при
// първото запазване — виж handleSave.
// ============================================================

const CYR_TO_LAT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch',
  ш: 'sh', щ: 'sht', ъ: 'a', ь: 'y', ю: 'yu', я: 'ya',
}

function generateSlug(title) {
  const transliterated = title
    .toLowerCase()
    .split('')
    .map((char) => CYR_TO_LAT[char] ?? char)
    .join('')

  return transliterated
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function JobListingForm() {
  const { id } = useParams()

  // ВАЖНО:
  // При /company-jobs/new id е undefined.
  // Това означава НОВА обява.
  // При /company-jobs/:id id съдържа UUID на обявата.
  const isNew = !id

  const navigate = useNavigate()
  const { session } = useAuth()
  const { showToast } = useToast()

  const dbTierOptions = useTierOptions()
  const tierOptionsLoading = dbTierOptions === null
  const TIER_OPTIONS = [
    ...[...(dbTierOptions || [])].reverse().map((t) => ({ ...t, description: TIER_DESCRIPTIONS[t.value] })),
    FREE_TIER,
  ]

  const [formData, setFormData] = useState(INITIAL_FORM_DATA)
  const canChooseTier = !formData.published_at
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)

  function handleBannerFileSelected(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingBannerFile(file)
    e.target.value = ''
  }

  async function handleBannerCropSave(croppedFile) {
    setPendingBannerFile(null)
    setUploadingBanner(true)

    // eslint-disable-next-line react-hooks/purity
    const filePath = `${session.user.id}/banner_${Date.now()}_${croppedFile.name}`

    const { error: uploadError } = await supabase.storage
      .from('company-logos')
      .upload(filePath, croppedFile, { upsert: true })

    if (uploadError) {
      showToast('Грешка при качване на банер: ' + uploadError.message, 'error')
      setUploadingBanner(false)
      return
    }

    const { data } = supabase.storage.from('company-logos').getPublicUrl(filePath)
    setFormData((prev) => ({ ...prev, banner_url: data.publicUrl }))
    setUploadingBanner(false)
  }


  const [selectedTier, setSelectedTier] = useState('free')
  const [pendingBannerFile, setPendingBannerFile] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [tokenBalance, setTokenBalance] = useState(0)
  const [showBuyCreditsModal, setShowBuyCreditsModal] = useState(false)

  const currentTierPrice = TIER_OPTIONS.find((t) => t.value === selectedTier)?.price || 0

  useEffect(() => {
    if (session) {
      supabase
        .from('companies')
        .select('token_balance')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => setTokenBalance(data?.token_balance || 0))
    }
  }, [session])

  // ============================================================
  // LOAD EXISTING LISTING
  // ============================================================

  useEffect(() => {
    // Нова обява - няма какво да зареждаме.
    if (isNew) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      return
    }

    // Ако не е нова, но по някаква причина няма ID,
    // не правим заявка към Supabase.
    if (!id) {
      console.error('JobListingForm: Missing listing ID')
      showToast('Липсва ID на обявата.', 'error')
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadListing() {
      try {
        setLoading(true)

        const { data, error } = await supabase
          .from('job_listings')
          .select('*')
          .eq('id', id)
          .single()

        // Компонентът вече не съществува.
        if (cancelled) return

        if (error) {
          console.error('Error loading job listing:', error)

          showToast(
            'Не успяхме да заредим обявата.',
            'error'
          )

          return
        }

        if (!data) {
          console.error('Job listing not found:', id)

          showToast(
            'Обявата не е намерена.',
            'error'
          )

          return
        }

        // Нормализираме данните от DB.
        // Така null стойности няма да чупят input/select.
        setFormData({
          title: data.title ?? '',
          description: data.description ?? '',
          sector: data.sector ?? '',
          level: data.level ?? '',
          duration: data.duration ?? '',
          city: data.city ?? '',
          salary: data.salary ?? '',
          salary_max: data.salary_max ?? '',
          salary_visible: data.salary_visible ?? true,
          application_mode: data.application_mode ?? 'platform',
          external_url: data.external_url ?? '',
          published_at: data.published_at ?? null,
          expires_at: data.expires_at ?? null,
          tier: data.tier ?? 'free',
          tier_rank: data.tier_rank ?? 0,
          post_to_facebook: data.post_to_facebook ?? true,
          banner_url: data.banner_url ?? '',
          slug: data.slug ?? '',
        })
        setSelectedTier(data.tier || 'free')
      } catch (error) {
        if (cancelled) return

        console.error(
          'Unexpected error loading job listing:',
          error
        )

        showToast(
          'Възникна неочаквана грешка при зареждането.',
          'error'
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadListing()

    // Ако потребителят напусне страницата,
    // докато заявката още върви.
    return () => {
      cancelled = true
    }
  }, [id, isNew, showToast])

  // ============================================================
  // FORM CHANGE
  // ============================================================

  function handleChange(e) {
    const { name, value, type, checked } = e.target

    setFormData((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  // ============================================================
  // SAVE
  // ============================================================

  async function handleSave(newStatus) {
    // Защита от двойно натискане.
    if (saving) return

    // Защита при липсваща authentication сесия.
    if (!session?.user?.id) {
      showToast(
        'Сесията ви е изтекла. Моля, влезте отново.',
        'error'
      )

      return
    }

    // ============================================================
    // VALIDATION
    // ============================================================

    const title = formData.title?.trim() || ''
    const description = formData.description?.trim() || ''

    if (!title || !description) {
      showToast(
        'Заглавие и описание са задължителни.',
        'error'
      )

      return
    }

    if (formData.application_mode === 'external') {
      const externalUrl = formData.external_url?.trim()

      if (!externalUrl) {
        showToast(
          'Моля, въведете линк за външно кандидатстване.',
          'error'
        )

        return
      }

      if (!/^https?:\/\//i.test(externalUrl)) {
        showToast(
          'Линкът за кандидатстване трябва да е валиден адрес, започващ с http:// или https://',
          'error'
        )

        return
      }
    }

    if (newStatus === 'published' && !formData.salary) {
      showToast(
        'Заплатата е задължителна, за да публикувате обявата — нужна е за автоматичното известяване на подходящи кандидати. Може да изберете да не се показва публично, ако предпочитате.',
        'error'
      )

      return
    }

    if (formData.salary_max && Number(formData.salary_max) < Number(formData.salary)) {
      showToast(
        'Горната граница на заплатата трябва да е по-голяма или равна на долната.',
        'error'
      )

      return
    }

    if (newStatus === 'published') {
      const { data: company } = await supabase
        .from('companies')
        .select('company_name, bulstat, sector, contact_phone, contact_email')
        .eq('id', session.user.id)
        .single()

      const profileComplete =
        company?.company_name?.trim() &&
        company?.bulstat?.trim() &&
        company?.sector?.trim() &&
        (company?.contact_phone?.trim() || company?.contact_email?.trim())

      if (!profileComplete) {
        showToast(
          'За да публикувате обяви, трябва първо да попълните фирмения си профил (име, ЕИК, сектор, и телефон или имейл за контакт).',
          'error'
        )

        return
      }
    }

    // ============================================================
    // TIER PAYMENT (само при ПЪРВОНАЧАЛНО публикуване с платено ниво —
    // при редакция на съществуваща обява selectedTier никога не се
    // променя от потребителя вече, значи тук няма как да гръмне
    // повторно плащане при обикновена редакция).
    // ============================================================
    let tierForSave = formData.tier || 'free'
    let tierRankForSave = formData.tier_rank || 0

    let effectiveStatus = newStatus
    let pendingCardTier = null
    let pendingTokenTier = null

    const currentTierRank = TIER_OPTIONS.find((t) => t.value === (formData.tier || 'free'))?.rank ?? 0
    const selectedTierRank = TIER_OPTIONS.find((t) => t.value === selectedTier)?.rank ?? 0
    const isTierUpgrade = selectedTier !== 'free' && selectedTierRank > currentTierRank

    if (newStatus === 'published' && isTierUpgrade) {
      const tierInfo = TIER_OPTIONS.find((t) => t.value === selectedTier)

      if (paymentMethod === 'credits') {
        if (tokenBalance < tierInfo.price) {
          showToast('Нямаш достатъчно кредити за това ниво. Купи бъндъл от "State Credits", или плати директно с карта.', 'error')
          return
        }
        // Реалното удържане на кредити + вдигане на нивото се случва
        // ПОСЛЕ, през сигурна SQL функция (redeem_tier_with_tokens) —
        // виж малко по-надолу, след успешния insert/update.
        pendingTokenTier = tierInfo
      } else {
        // Само НОВА обява отива в чернова, докато чака плащане.
        if (isNew) {
          effectiveStatus = 'draft'
        }
        pendingCardTier = tierInfo
      }
    }

    // ============================================================
    // PREPARE DATA
    // ============================================================

    setSaving(true)

    try {
      let salary = null

      if (
        formData.salary !== '' &&
        formData.salary !== null &&
        formData.salary !== undefined
      ) {
        const parsedSalary = Number(formData.salary)

        if (!Number.isNaN(parsedSalary)) {
          salary = parsedSalary
        }
      }

      const slug = formData.slug || generateSlug(title)

      const payload = {
        company_id: session.user.id,

        title,
        description,
        slug,

        sector: formData.sector || null,
        level: formData.level || null,
        duration: formData.duration || null,
        city: formData.city || null,

        salary,
        salary_max: formData.salary_max !== '' && formData.salary_max !== null ? Number(formData.salary_max) : null,

        salary_visible: Boolean(
          formData.salary_visible
        ),

        application_mode:
          formData.application_mode || 'platform',

        external_url:
          formData.application_mode === 'external'
            ? formData.external_url.trim()
            : null,

        status: effectiveStatus,

        published_at:
          effectiveStatus === 'published' &&
            !formData.published_at
            ? new Date().toISOString()
            : formData.published_at || null,

        expires_at:
          effectiveStatus === 'published' &&
            !formData.published_at
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            : formData.expires_at || null,
        tier: tierForSave,
        tier_rank: tierRankForSave,
        banner_url: formData.banner_url || null,
        post_to_facebook: selectedTier !== 'free' ? formData.post_to_facebook : false,
      }

      // ============================================================
      // INSERT / UPDATE
      // ============================================================

      let result

      if (isNew) {
        // --------------------------------------------------------
        // NEW LISTING
        // --------------------------------------------------------

        result = await supabase
          .from('job_listings')
          .insert(payload)
          .select()
          .single()
      } else {
        // --------------------------------------------------------
        // EDIT EXISTING LISTING
        // --------------------------------------------------------

        if (!id) {
          showToast(
            'Липсва ID на обявата.',
            'error'
          )

          return
        }

        result = await supabase
          .from('job_listings')
          .update(payload)
          .eq('id', id)
          .eq('company_id', session.user.id)
          .select()
          .single()
      }

      // ============================================================
      // DATABASE ERROR
      // ============================================================

      if (result.error) {
        console.error(
          'Error saving job listing:',
          result.error
        )

        showToast(
          'Грешка при запазването: ' +
          result.error.message,
          'error'
        )

        return
      }

      if (!result.data) {
        console.error(
          'Job listing save returned no data.'
        )

        showToast(
          'Обявата не беше запазена.',
          'error'
        )

        return
      }

      // ============================================================
      // ПЛАЩАНЕ С КРЕДИТИ — удържа токените и вдига нивото на сървъра
      // (сигурна RPC функция, клиентът вече не пипа token_balance/tier
      // директно).
      // ============================================================
      if (pendingTokenTier) {
        const { error: redeemError } = await supabase.rpc('redeem_tier_with_tokens', {
          p_job_id: result.data.id,
          p_tier: pendingTokenTier.value,
        })

        if (redeemError) {
          showToast('Обявата е публикувана като безплатна — плащането с кредити не мина: ' + redeemError.message, 'error')
        } else {
          setTokenBalance((prev) => prev - pendingTokenTier.price)
        }
      }

      // ============================================================
      // AUTO MATCHING
      // ============================================================

      if (
        effectiveStatus === 'published' &&
        !formData.published_at
      ) {
        try {
          const {
            error: matchError,
          } = await supabase.functions.invoke(
            'match-job-listing',
            {
              body: {
                jobListingId: result.data.id,
              },
            }
          )

          if (matchError) {
            console.error(
              'Auto-matching error:',
              matchError
            )
          }
        } catch (matchError) {
          console.error(
            'Unexpected auto-matching error:',
            matchError
          )
        }

        // ============================================================
        // AUTO POST TO FACEBOOK (само ако е избрано, и само платени нива)
        // ============================================================
        if (selectedTier !== 'free' && formData.post_to_facebook) {
          try {
            const { error: fbError } = await supabase.functions.invoke(
              'post-job-to-facebook',
              { body: { jobListingId: result.data.id } }
            )
            if (fbError) {
              console.error('Facebook auto-post error:', fbError)
            }
          } catch (fbError) {
            console.error('Unexpected Facebook auto-post error:', fbError)
          }
        }
      }

      // ============================================================
      // ПЛАЩАНЕ С КАРТА — пренасочва към Stripe, обявата чака в чернова
      // ============================================================
      if (pendingCardTier) {
        const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
          'create-checkout-session',
          {
            body: {
              priceId: pendingCardTier.priceId,
              metadata: { jobListingId: result.data.id, tier: pendingCardTier.value },
            },
          }
        )

        if (checkoutError || !checkoutData?.url) {
          showToast('Записано като чернова, но плащането не стартира. Опитай пак.', 'error')
          navigate('/company-jobs')
          return
        }

        window.location.href = checkoutData.url
        return
      }

      // ============================================================
      // SUCCESS
      // ============================================================

      showToast(
        effectiveStatus === 'published'
          ? (isNew ? 'Обявата е публикувана!' : 'Промените са запазени!')
          : 'Записано като чернова',
        'success'
      )

      navigate('/company-jobs')
    } catch (error) {
      console.error(
        'Unexpected error saving job listing:',
        error
      )

      showToast(
        'Възникна неочаквана грешка. Моля, опитайте отново.',
        'error'
      )
    } finally {
      // ВИНАГИ отключваме бутоните.
      setSaving(false)
    }
  }

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        Зареждане...
      </div>
    )
  }

  // ============================================================
  // FORM
  // ============================================================

  return (
    <div className="cv-form-shell">

      <h2 className="cv-form-title">
        {isNew
          ? 'Нова обява'
          : 'Редакция на обява'}
      </h2>

      {/* ======================================================
          BASIC INFORMATION
      ====================================================== */}

      <div className="cv-form-section">

        <div className="field">
          <label>
            Заглавие на позицията *
          </label>

          <input
            className="input"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="напр. Продавач-консултант"
            disabled={saving}
          />
        </div>

        <div className="field" style={{ marginTop: '1.5rem' }}>
          <label>Банер на обявата (по избор)</label>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
            Ако не качиш банер, ще се показва логото на фирмата вместо него.
          </p>
          {formData.banner_url && (
            <div style={{ marginBottom: '0.5rem' }}>
              <img src={formData.banner_url} alt="Банер" style={{ maxWidth: '100%', maxHeight: '140px', borderRadius: 'var(--radius-md)', display: 'block', marginBottom: '0.4rem' }} />
              <button
                type="button"
                className="btn-text-danger"
                onClick={() => setFormData((prev) => ({ ...prev, banner_url: '' }))}
              >
                Премахни банер
              </button>
            </div>
          )}
          <input type="file" accept="image/*" onChange={handleBannerFileSelected} disabled={uploadingBanner} />
          {uploadingBanner && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Качване...</p>}
        </div>

        <div className="field">
          <label>
            Описание *
          </label>

          <textarea
            className="input"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={6}
            disabled={saving}
          />
        </div>

        <div className="cv-entry-row">

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                color: 'var(--color-text-muted)',
                marginBottom: '0.4rem',
              }}
            >
              Сектор
            </label>

            <SectorSelect
              value={formData.sector}
              onChange={(val) => setFormData((prev) => ({ ...prev, sector: val }))}
              options={sectors}
              disabled={saving}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                color: 'var(--color-text-muted)',
                marginBottom: '0.4rem',
              }}
            >
              Град
            </label>

            <select
              className="input"
              name="city"
              value={formData.city}
              onChange={handleChange}
              disabled={saving}
            >
              <option value="">
                -- Избери град --
              </option>

              {allCities.map((city) => (
                <option
                  key={city}
                  value={city}
                >
                  {city}
                </option>
              ))}
            </select>
          </div>

        </div>

        <div className="cv-entry-row">

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                color: 'var(--color-text-muted)',
                marginBottom: '0.4rem',
              }}
            >
              Ниво
            </label>

            <select
              className="input"
              name="level"
              value={formData.level}
              onChange={handleChange}
              disabled={saving}
            >
              <option value="">
                -- Избери --
              </option>

              {LEVEL_OPTIONS.map((level) => (
                <option
                  key={level}
                  value={level}
                >
                  {level}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                color: 'var(--color-text-muted)',
                marginBottom: '0.4rem',
              }}
            >
              Заетост
            </label>

            <select
              className="input"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              disabled={saving}
            >
              <option value="">
                -- Избери --
              </option>

              {DURATION_OPTIONS.map((duration) => (
                <option
                  key={duration}
                  value={duration}
                >
                  {duration}
                </option>
              ))}
            </select>
          </div>

        </div>

        <div className="cv-entry-row">
          <div className="field">
            <label>Предлагана нетна заплата (€) — от</label>
            <input
              type="number"
              min="0"
              step="1"
              className="input"
              name="salary"
              value={formData.salary}
              onChange={handleChange}
              disabled={saving}
            />
          </div>

          <div className="field">
            <label>До (по избор — за диапазон)</label>
            <input
              type="number"
              min="0"
              step="1"
              className="input"
              name="salary_max"
              value={formData.salary_max}
              onChange={handleChange}
              disabled={saving}
              placeholder="напр. 1000"
            />
          </div>
        </div>

        <label className="checkbox-item" style={{ marginBottom: '1rem', }}>
          <input type="checkbox" name="salary_visible" checked={formData.salary_visible} onChange={handleChange} disabled={saving} />
          Показвай заплатата публично в обявата
        </label>

        <label className="checkbox-item" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input type="checkbox" name="post-to-facebook" checked={formData.post_to_facebook} onChange={(e) => setFormData((prev) => ({ ...prev, post_to_facebook: e.target.checked }))} />
          Тази обява да се публикува и във Facebook страницата на Jobstate
        </label>

      </div>

      {/* ======================================================
          APPLICATION
      ====================================================== */}

      <div className="cv-form-section">

        <h3 className="cv-form-section-title">
          Кандидатстване
        </h3>

        <div className="field">

          <label>
            Как да кандидатстват хората?
          </label>

          <select
            className="input"
            name="application_mode"
            value={formData.application_mode}
            onChange={handleChange}
            disabled={saving}
          >
            <option value="platform">
              През Jobstate
            </option>

            <option value="external">
              Външен линк (към наш сайт/формуляр)
            </option>
          </select>

        </div>

        {formData.application_mode ===
          'external' && (

            <div className="field">

              <label>
                Линк за кандидатстване
              </label>

              <input
                className="input"
                name="external_url"
                value={formData.external_url}
                onChange={handleChange}
                placeholder="https://..."
                disabled={saving}
              />

            </div>
          )}

      </div>

      {/* ======================================================
          TIER SELECTION — само при ПЪРВО публикуване. При редакция
          на съществуваща обява нивото вече не се сменя оттук —
          само от бутона "Ъпгрейд" в "Моите обяви" (JobListingsManage.jsx).
      ====================================================== */}

      <div className="field" style={{ marginTop: '2rem' }}>
        <label>Ниво на обявата</label>

        {!canChooseTier ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Текущо ниво:{' '}
            <strong>
              {TIER_OPTIONS.find((t) => t.value === formData.tier)?.label || 'Безплатна'}
            </strong>
            . Промяна на нивото става от бутона "Ъпгрейд" в "Моите обяви".
          </p>
        ) : (
          <>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              По-високите нива се показват най-отгоре в списъка с обяви. Важи за 30 дни, докато обявата е активна.
            </p>

            <div className="tier-select-grid">
              {TIER_OPTIONS.map((t) => {
                const isSelected = selectedTier === t.value;
                return (
                  <button
                    type="button"
                    key={t.value}
                    className={`tier-card-wrapper ${t.value}-tier ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedTier(t.value)}
                  >
                    <div className="tier-card-content">

                      <div className="tier-card-header" style={{ alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left' }}>

                          {t.value !== 'free' && (
                            <span className={`tier-badge tier-badge--${t.value}`}>
                              {t.value === 'diamond' && '💎 Diamond'}
                              {t.value === 'platinum' && '❖ Platinum'}
                              {t.value === 'gold' && '✦ Gold'}
                              {t.value === 'silver' && '✦ Silver'}

                            </span>
                          )}
                        </div>

                        {/* Отметката при избор */}
                        {isSelected && <span className="tier-check-badge">✓</span>}
                      </div>
                      {/* КРАЙ НА ОБНОВЕНИЯ ХЕДЪР */}

                      <div className="tier-card-body">
                        <div className="tier-price-display">
                          {t.value === 'free' ? (
                            <>
                              <span className="price-free">Безплатно</span>
                              <span className="price-sub">{t.description}</span>
                            </>
                          ) : (
                            <>
                              <span className="price-sub">{t.description}</span>
                              <span className="price-amount">{t.price} €</span>
                              <span className="price-sub">/ {t.price} SC</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className={`tier-select-btn ${isSelected ? 'active' : ''}`}>
                        {isSelected ? 'Избран' : 'Избери'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedTier !== 'free' && (
              <div className="payment-method-container">
                <label className="payment-method-label">Начин на плащане</label>

                <div className="payment-method-grid">
                  <button
                    type="button"
                    className={`payment-option-card ${paymentMethod === 'card' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('card')}
                  >
                    <span className="payment-option-icon">💳</span>
                    <div className="payment-option-info">
                      <span className="payment-option-title">Плати с карта</span>
                      <span className="payment-option-sub">Stripe / Visa / Mastercard</span>
                    </div>
                    <div className="payment-radio-indicator" />
                  </button>

                  <button
                    type="button"
                    className={`payment-option-card ${paymentMethod === 'credits' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('credits')}
                  >
                    <span className="payment-option-icon"><img src={stateCreditSvg} alt="SC" style={{ width: 30, height: 30 }} /></span>
                    <div className="payment-option-info">
                      <span className="payment-option-title">Плати с кредити</span>
                      <span className="payment-token-badge">
                        Налични: <strong>{tokenBalance} SC</strong>
                      </span>
                    </div>
                    <div className="payment-radio-indicator" />
                  </button>
                </div>

                {/* Динамичен стилизиран информационен / предупредителен блок */}
                {paymentMethod === 'card' && (
                  <div className="payment-info-box info">
                    <span className="info-icon">ℹ️</span>
                    <p>
                      Обявата ще стане публична веднага след успешно плащане — 30-те дни започват от тогава.
                    </p>
                  </div>
                )}

                {paymentMethod === 'credits' && tokenBalance < currentTierPrice && (
                  <div className="payment-info-box warning">
                    <span className="info-icon">⚠️</span>
                    <p>
                      Нямаш достатъчно кредити за това ниво — купи бъндъл със{' '}
                      <strong>
                        <a href="#" onClick={(e) => { e.preventDefault(); setShowBuyCreditsModal(true) }} style={{ color: 'inherit', textDecoration: 'underline' }}>
                          "State Credits (SC)" от ТУК
                        </a>
                      </strong>{' '}
                      или избери плащане с карта.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ======================================================
          ACTIONS
      ====================================================== */}

      <div className="blog-editor-toolbar">

        <button
          type="button"
          className="btn-secondary"
          onClick={() => handleSave('draft')}
          disabled={saving}
        >
          {saving
            ? 'Запазване...'
            : 'Запази като чернова'}
        </button>

        <button
          type="button"
          className="btn-primary"
          onClick={() => handleSave('published')}
          disabled={saving || tierOptionsLoading}
        >
          {saving
            ? (canChooseTier ? 'Публикувам...' : 'Запазвам...')
            : (canChooseTier ? 'Публикувай обявата' : 'Запази промените')}
        </button>

      </div>
      {showBuyCreditsModal && (
        <BuyCreditsModal
          onClose={() => setShowBuyCreditsModal(false)}
          onBalanceUpdate={(newBalance) => setTokenBalance(newBalance)}
        />
      )}
      {pendingBannerFile && (
        <ImageCropperModal
          imageFile={pendingBannerFile}
          aspect={732 / 260}
          outputWidth={1200}
          outputHeight={426}
          title="Нагласи банера"
          onCancel={() => setPendingBannerFile(null)}
          onSave={handleBannerCropSave}
        />
      )}
    </div>
  )
}
