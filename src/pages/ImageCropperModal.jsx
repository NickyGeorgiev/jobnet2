import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'

// Изрязва зоната, върната от react-easy-crop (пиксели спрямо оригиналната
// снимка), и я рисува в нов canvas с точно зададени изходни размери —
// резултатът винаги е с правилното съотношение, независимо от оригинала.
async function getCroppedBlob(imageSrc, cropAreaPixels, outputWidth, outputHeight) {
    const image = await new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.crossOrigin = 'anonymous'
        img.src = imageSrc
    })

    const canvas = document.createElement('canvas')
    canvas.width = outputWidth
    canvas.height = outputHeight
    const ctx = canvas.getContext('2d')

    ctx.drawImage(
        image,
        cropAreaPixels.x,
        cropAreaPixels.y,
        cropAreaPixels.width,
        cropAreaPixels.height,
        0,
        0,
        outputWidth,
        outputHeight
    )

    return new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.88))
}

// aspect: ширина/височина (напр. 4 за 1200x300 банер, 1 за квадратно лого)
// outputWidth/outputHeight: реалните пиксели, в които се запазва резултатът
export function ImageCropperModal({ imageFile, aspect, outputWidth, outputHeight, title, onCancel, onSave }) {
    const [imageSrc] = useState(() => URL.createObjectURL(imageFile))
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
    const [saving, setSaving] = useState(false)

    const onCropComplete = useCallback((_croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    async function handleSave() {
        if (!croppedAreaPixels) return
        setSaving(true)
        try {
            const blob = await getCroppedBlob(imageSrc, croppedAreaPixels, outputWidth, outputHeight)
            // Оригиналното име на файла може да съдържа символи, които
            // Supabase Storage отказва в пътя (напр. ©, интервали, кирилица).
            // Не пазим оригиналното име за нищо съществено — просто
            // почистваме до безопасни символи.
            const safeName = imageFile.name
                .replace(/\.[^.]+$/, '')
                .replace(/[^a-zA-Z0-9-_]/g, '')
                .slice(0, 40) || 'image'
            const file = new File([blob], `${safeName}.webp`, { type: 'image/webp' })
            onSave(file)
        } finally {
            setSaving(false)
            URL.revokeObjectURL(imageSrc)
        }
    }

    function handleCancel() {
        URL.revokeObjectURL(imageSrc)
        onCancel()
    }

    return (
        <div className="cv-modal-backdrop" onClick={handleCancel}>
            <div className="cv-modal-inner" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
                <div className="cv-modal-actions">
                    <button className="cv-modal-close" onClick={handleCancel} aria-label="Затвори">✕</button>
                </div>

                <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
                    {title && <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>{title}</h3>}

                    <div style={{ position: 'relative', width: '100%', height: '320px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={aspect}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={onCropComplete}
                        />
                    </div>

                    <div className="field" style={{ marginTop: '1.25rem', marginBottom: '0.5rem' }}>
                        <label>Приближение</label>
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.05}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1rem' }}>
                        <button className="btn-secondary" onClick={handleCancel} disabled={saving}>Отказ</button>
                        <button className="btn-primary" onClick={handleSave} disabled={saving || !croppedAreaPixels}>
                            {saving ? 'Запазва се...' : 'Запази'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}