import React, { useState, useEffect } from 'react'
import { useInView } from 'react-intersection-observer'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  sizes?: string
}

const OptimizedImage: React.FC<OptimizedImageProps> = React.memo(({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  sizes = '100vw'
}) => {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '50px',
    skip: priority
  })

  const shouldLoad = priority || inView

  // Generate responsive srcSet
  const generateSrcSet = (baseSrc: string) => {
    const extension = baseSrc.split('.').pop()
    const basename = baseSrc.replace(`.${extension}`, '')

    // Check if WebP is supported
    const supportsWebP = typeof window !== 'undefined' &&
      window.navigator.userAgent.indexOf('Safari') === -1

    const format = supportsWebP ? 'webp' : extension

    return {
      srcSet: `
        ${basename}-320w.${format} 320w,
        ${basename}-640w.${format} 640w,
        ${basename}-1280w.${format} 1280w,
        ${basename}-1920w.${format} 1920w
      `.trim(),
      src: `${basename}-1280w.${format}`
    }
  }

  useEffect(() => {
    if (shouldLoad && !loaded && !error) {
      const img = new Image()
      img.onload = () => setLoaded(true)
      img.onerror = () => setError(true)
      img.src = src
    }
  }, [shouldLoad, src, loaded, error])

  if (error) {
    return (
      <div
        className={`bg-gray-800 flex items-center justify-center ${className}`}
        style={{ width, height }}
        role="img"
        aria-label={alt}
      >
        <span className="text-gray-600">Failed to load image</span>
      </div>
    )
  }

  return (
    <div ref={ref} className={`relative ${className}`} style={{ width, height }}>
      {/* Blur placeholder */}
      {!loaded && (
        <div
          className="absolute inset-0 bg-gray-800 animate-pulse"
          aria-hidden="true"
        />
      )}

      {/* Actual image */}
      {shouldLoad && (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className={`${!loaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}
    </div>
  )
})

OptimizedImage.displayName = 'OptimizedImage'

export default OptimizedImage
