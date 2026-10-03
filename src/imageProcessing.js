import heic2any from 'heic2any'

// mimeType по избор — по подразбиране си остава 'image/webp' (по-малък файл),
// но логата на фирмите трябва да са 'image/png': Satori (рендерерът на
// opengraph-image.tsx в SSR сайта) не поддържа WebP и гърми при опит да го
// прочете — вижте "Can't load image ...webp: Unsupported image type".
export async function convertImageToWebp(file, maxWidth = 800, mimeType = 'image/webp') {
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

  const extension = mimeType === 'image/png' ? '.png' : '.webp'
  const outBlob = await new Promise((resolve) => canvas.toBlob(resolve, mimeType, 0.85))
  return new File([outBlob], file.name.replace(/\.[^.]+$/, extension), { type: mimeType })
}