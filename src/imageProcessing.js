import heic2any from 'heic2any'

export async function convertImageToWebp(file, maxWidth = 800) {
  let blob = file
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || /\.hei[cf]$/i.test(file.name)

  if (isHeic) {
    blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
    if (Array.isArray(blob)) blob = blob[0]
  }

  const imgUrl = URL.createObjectURL(blob)
  const img = await new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = imgUrl
  })

  const scale = Math.min(1, maxWidth / img.width)
  const canvas = document.createElement('canvas')
  canvas.width = img.width * scale
  canvas.height = img.height * scale
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
  URL.revokeObjectURL(imgUrl)

  const webpBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85))
  return new File([webpBlob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' })
}