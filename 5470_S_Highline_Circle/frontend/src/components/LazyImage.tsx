import React, { useState, useEffect, useRef } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  threshold?: number;
  rootMargin?: string;
}

export default function LazyImage({
  src,
  alt,
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect width="400" height="300" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="system-ui" font-size="20"%3ELoading...%3C/text%3E%3C/svg%3E',
  className = '',
  onLoad,
  onError,
  threshold = 0.1,
  rootMargin = '50px',
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!imageRef) return;

    // Check if IntersectionObserver is supported
    if (!('IntersectionObserver' in window)) {
      // Fallback: load image immediately
      loadImage();
      return;
    }

    // Create observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadImage();
            // Stop observing once image starts loading
            if (observerRef.current) {
              observerRef.current.unobserve(imageRef);
            }
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    // Start observing
    observerRef.current.observe(imageRef);

    // Cleanup
    return () => {
      if (observerRef.current && imageRef) {
        observerRef.current.unobserve(imageRef);
      }
    };
  }, [imageRef, src, threshold, rootMargin]);

  const loadImage = () => {
    const img = new Image();

    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
      if (onLoad) onLoad();
    };

    img.onerror = () => {
      setIsError(true);
      setImageSrc(placeholder);
      if (onError) onError();
    };

    img.src = src;
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        ref={setImageRef}
        src={imageSrc}
        alt={alt}
        className={`
          w-full h-full object-cover transition-all duration-300
          ${isLoaded ? 'opacity-100 blur-0' : 'opacity-70 blur-sm'}
          ${isError ? 'grayscale' : ''}
        `}
      />

      {/* Loading skeleton */}
      {!isLoaded && !isError && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse" />
      )}

      {/* Error state */}
      {isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-500">Failed to load image</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Batch lazy loading component for gallery views
export function LazyImageGallery({
  images,
  className = '',
  itemClassName = '',
}: {
  images: Array<{ src: string; alt: string; id?: string | number }>;
  className?: string;
  itemClassName?: string;
}) {
  const [loadedImages, setLoadedImages] = useState<Set<string | number>>(new Set());

  const handleImageLoad = (id: string | number) => {
    setLoadedImages((prev) => new Set(prev).add(id));
  };

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
      {images.map((image, index) => {
        const imageId = image.id || index;
        return (
          <div
            key={imageId}
            className={`aspect-square ${itemClassName}`}
          >
            <LazyImage
              src={image.src}
              alt={image.alt}
              onLoad={() => handleImageLoad(imageId)}
              className="w-full h-full"
            />
            {loadedImages.has(imageId) && (
              <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
