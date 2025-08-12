import React, { useState, useEffect, useRef, ImgHTMLAttributes } from 'react'
import { motion } from 'framer-motion'
import { useIntersectionObserver } from '../hooks/useIntersectionObserver'

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  placeholder?: string
  blur?: boolean
  priority?: boolean
  onLoad?: () => void
  onError?: () => void
  sizes?: string
  srcSet?: string
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder,
  blur = true,
  priority = false,
  onLoad,
  onError,
  className = '',
  sizes,
  srcSet,
  ...rest
}) => {
  const [imageSrc, setImageSrc] = useState<string>(placeholder || '')
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const { isIntersecting } = useIntersectionObserver(containerRef, {
    threshold: 0.01,
    rootMargin: '50px'
  })

  // Load image immediately if priority
  const shouldLoad = priority || isIntersecting

  useEffect(() => {
    if (!shouldLoad || imageLoaded) return

    const img = new Image()
    
    // Set sizes and srcset if provided
    if (sizes) img.sizes = sizes
    if (srcSet) img.srcset = srcSet
    
    img.src = src

    const handleLoad = () => {
      setImageSrc(src)
      setImageLoaded(true)
      if (onLoad) onLoad()
    }

    const handleError = () => {
      setImageError(true)
      setImageLoaded(true)
      if (onError) onError()
      console.error(`Failed to load image: ${src}`)
    }

    img.addEventListener('load', handleLoad)
    img.addEventListener('error', handleError)

    // Check if already loaded
    if (img.complete && img.naturalWidth > 0) {
      handleLoad()
    }

    return () => {
      img.removeEventListener('load', handleLoad)
      img.removeEventListener('error', handleError)
    }
  }, [shouldLoad, src, srcSet, sizes, imageLoaded, onLoad, onError])

  // Generate placeholder styles
  const placeholderStyles: React.CSSProperties = {
    filter: blur && !imageLoaded ? 'blur(20px)' : 'none',
    transform: !imageLoaded ? 'scale(1.1)' : 'scale(1)',
    transition: 'filter 0.3s ease-out, transform 0.3s ease-out'
  }

  if (imageError) {
    return (
      <div 
        ref={containerRef}
        className={`flex items-center justify-center bg-gray-800 ${className}`}
        style={{ aspectRatio: rest.width && rest.height ? `${rest.width}/${rest.height}` : 'auto' }}
      >
        <div className="text-gray-500 text-sm">Failed to load image</div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      <motion.img
        ref={imgRef}
        src={imageSrc || placeholder || ''}
        alt={alt}
        sizes={sizes}
        srcSet={imageLoaded && srcSet ? srcSet : undefined}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        initial={{ opacity: 0 }}
        animate={{ opacity: imageLoaded ? 1 : 0.5 }}
        transition={{ duration: 0.3 }}
        style={placeholderStyles}
        {...rest}
      />
      {!imageLoaded && placeholder && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-800 to-gray-700" />
      )}
    </div>
  )
}

// Optimized background image component
export const LazyBackgroundImage: React.FC<{
  src: string
  className?: string
  children?: React.ReactNode
  overlay?: boolean
}> = ({ src, className = '', children, overlay = true }) => {
  const [loaded, setLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { isIntersecting } = useIntersectionObserver(containerRef, {
    threshold: 0.01,
    rootMargin: '100px'
  })

  useEffect(() => {
    if (!isIntersecting || loaded) return

    const img = new Image()
    img.src = src
    img.onload = () => setLoaded(true)
  }, [isIntersecting, src, loaded])

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      style={{
        backgroundImage: loaded ? `url(${src})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-gray-800 animate-pulse" />
      )}
      {overlay && (
        <div className="absolute inset-0 bg-black/50" />
      )}
      {children}
    </div>
  )
}

// Picture element with responsive images
export const ResponsiveImage: React.FC<{
  src: string
  alt: string
  sources?: Array<{
    srcSet: string
    media?: string
    type?: string
  }>
  className?: string
  priority?: boolean
}> = ({ src, alt, sources = [], className = '', priority = false }) => {
  const [loaded, setLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { isIntersecting } = useIntersectionObserver(containerRef, {
    threshold: 0.01,
    rootMargin: '50px'
  })

  const shouldLoad = priority || isIntersecting

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {shouldLoad && (
        <picture>
          {sources.map((source, index) => (
            <source
              key={index}
              srcSet={source.srcSet}
              media={source.media}
              type={source.type}
            />
          ))}
          <motion.img
            src={src}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            decoding={priority ? 'sync' : 'async'}
            onLoad={() => setLoaded(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: loaded ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full object-cover"
          />
        </picture>
      )}
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-gray-700 animate-pulse" />
      )}
    </div>
  )
}

export default LazyImage