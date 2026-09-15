import { useState } from 'react'
import type { MediaImage } from '../types'

interface SafeImageProps {
  image: MediaImage
  className?: string
  loading?: 'lazy' | 'eager'
  sizes?: string
}

const MEDIA_RE = /^\/media\/(.+)\.jpg$/

/** Image with fixed-ratio fallback; auto 600w/1200w srcSet for /media assets. */
export function SafeImage({ image, className, loading = 'lazy', sizes }: SafeImageProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className={`img-fallback${className ? ` ${className}` : ''}`} role="img" aria-label={image.alt}>
        <span>{image.alt || 'Image unavailable'}</span>
      </div>
    )
  }

  let srcSet: string | undefined
  const match = image.src.match(MEDIA_RE)
  if (match) srcSet = `/media/${match[1]}-600.jpg 600w, ${image.src} 1200w`

  return (
    <img
      className={className}
      src={image.src}
      srcSet={srcSet}
      alt={image.alt}
      loading={loading}
      sizes={sizes ?? (srcSet ? '(max-width: 768px) 600px, 1200px' : undefined)}
      style={image.position ? { objectPosition: image.position } : undefined}
      onError={() => setFailed(true)}
    />
  )
}
