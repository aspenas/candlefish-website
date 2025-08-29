package services

import (
	"bytes"
	"context"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/disintegration/imaging"
	"github.com/google/uuid"
)

// ImageOptimizer handles all image optimization operations
type ImageOptimizer struct {
	// Storage paths
	uploadPath    string
	cachePath     string
	cdnBaseURL    string
	
	// Processing configuration
	processingPool *WorkerPool
	imageCache     *ImageCache
	
	// Optimization settings
	jpegQuality    int
	webpQuality    int
	pngCompression png.CompressionLevel
	
	// Size presets
	sizePresets map[string]ImageSize
	
	// Metrics
	metrics *ImageMetrics
}

// ImageSize defines dimensions for image resizing
type ImageSize struct {
	Width  int
	Height int
	Suffix string
	Format string
}

// WorkerPool manages concurrent image processing
type WorkerPool struct {
	workers   int
	jobQueue  chan ImageJob
	wg        sync.WaitGroup
}

// ImageJob represents an image processing task
type ImageJob struct {
	ID         string
	SourcePath string
	TargetPath string
	Size       ImageSize
	Format     string
	OnComplete func(error)
}

// ImageCache provides fast access to processed images
type ImageCache struct {
	cache map[string]*CachedImage
	mu    sync.RWMutex
	maxSize int64
	currentSize int64
}

// CachedImage represents a cached processed image
type CachedImage struct {
	Path        string
	Data        []byte
	ContentType string
	Size        int64
	AccessTime  time.Time
	AccessCount int
}

// ImageMetrics tracks image processing metrics
type ImageMetrics struct {
	TotalProcessed   int64
	TotalOptimized   int64
	BytesSaved       int64
	ProcessingTime   time.Duration
	CacheHits        int64
	CacheMisses      int64
	mu               sync.RWMutex
}

// NewImageOptimizer creates an optimized image handler
func NewImageOptimizer(uploadPath, cachePath, cdnBaseURL string) *ImageOptimizer {
	optimizer := &ImageOptimizer{
		uploadPath:     uploadPath,
		cachePath:      cachePath,
		cdnBaseURL:     cdnBaseURL,
		jpegQuality:    85,
		webpQuality:    80,
		pngCompression: png.BestSpeed,
		imageCache:     NewImageCache(100 * 1024 * 1024), // 100MB cache
		metrics:        &ImageMetrics{},
	}
	
	// Initialize size presets
	optimizer.sizePresets = map[string]ImageSize{
		"thumbnail": {Width: 150, Height: 150, Suffix: "_thumb", Format: "webp"},
		"small":     {Width: 320, Height: 240, Suffix: "_small", Format: "webp"},
		"medium":    {Width: 640, Height: 480, Suffix: "_medium", Format: "webp"},
		"large":     {Width: 1024, Height: 768, Suffix: "_large", Format: "jpeg"},
		"full":      {Width: 1920, Height: 1080, Suffix: "_full", Format: "jpeg"},
		"mobile":    {Width: 375, Height: 667, Suffix: "_mobile", Format: "webp"},
		"tablet":    {Width: 768, Height: 1024, Suffix: "_tablet", Format: "webp"},
	}
	
	// Initialize worker pool
	optimizer.processingPool = NewWorkerPool(4)
	optimizer.processingPool.Start()
	
	// Ensure directories exist
	os.MkdirAll(uploadPath, 0755)
	os.MkdirAll(cachePath, 0755)
	
	return optimizer
}

// ProcessImage optimizes and generates multiple sizes
func (o *ImageOptimizer) ProcessImage(ctx context.Context, sourcePath string, itemID string) (map[string]string, error) {
	startTime := time.Now()
	
	// Open source image with auto-rotation
	src, err := imaging.Open(sourcePath, imaging.AutoOrientation(true))
	if err != nil {
		return nil, fmt.Errorf("failed to open image: %w", err)
	}
	
	// Get original dimensions
	bounds := src.Bounds()
	originalWidth := bounds.Dx()
	originalHeight := bounds.Dy()
	
	results := make(map[string]string)
	var wg sync.WaitGroup
	var mu sync.Mutex
	errors := make([]error, 0)
	
	// Process each size preset in parallel
	for presetName, size := range o.sizePresets {
		// Skip if original is smaller than target
		if originalWidth < size.Width && originalHeight < size.Height {
			continue
		}
		
		wg.Add(1)
		go func(name string, sz ImageSize) {
			defer wg.Done()
			
			outputPath := o.generateOutputPath(itemID, name, sz.Format)
			
			// Check cache first
			if cached := o.imageCache.Get(outputPath); cached != nil {
				mu.Lock()
				results[name] = outputPath
				mu.Unlock()
				
				o.metrics.mu.Lock()
				o.metrics.CacheHits++
				o.metrics.mu.Unlock()
				return
			}
			
			// Process image
			processed := o.resizeImage(src, sz)
			
			// Optimize based on format
			var buf bytes.Buffer
			switch sz.Format {
			case "webp":
				err = o.encodeWebP(&buf, processed)
			case "jpeg":
				err = o.encodeJPEG(&buf, processed)
			case "png":
				err = o.encodePNG(&buf, processed)
			default:
				err = o.encodeJPEG(&buf, processed)
			}
			
			if err != nil {
				mu.Lock()
				errors = append(errors, err)
				mu.Unlock()
				return
			}
			
			// Save to disk
			if err := o.saveImage(outputPath, buf.Bytes()); err != nil {
				mu.Lock()
				errors = append(errors, err)
				mu.Unlock()
				return
			}
			
			// Add to cache
			o.imageCache.Set(outputPath, buf.Bytes(), sz.Format)
			
			mu.Lock()
			results[name] = outputPath
			mu.Unlock()
			
			// Update metrics
			o.metrics.mu.Lock()
			o.metrics.TotalProcessed++
			o.metrics.CacheMisses++
			o.metrics.mu.Unlock()
		}(presetName, size)
	}
	
	wg.Wait()
	
	if len(errors) > 0 {
		return results, fmt.Errorf("some images failed to process: %v", errors[0])
	}
	
	// Update metrics
	o.metrics.mu.Lock()
	o.metrics.ProcessingTime += time.Since(startTime)
	o.metrics.mu.Unlock()
	
	// Generate responsive image set
	results["srcset"] = o.generateSrcSet(results)
	
	return results, nil
}

// resizeImage resizes image maintaining aspect ratio
func (o *ImageOptimizer) resizeImage(src image.Image, size ImageSize) image.Image {
	// Calculate dimensions maintaining aspect ratio
	bounds := src.Bounds()
	srcWidth := float64(bounds.Dx())
	srcHeight := float64(bounds.Dy())
	
	ratio := srcWidth / srcHeight
	targetRatio := float64(size.Width) / float64(size.Height)
	
	var newWidth, newHeight int
	
	if ratio > targetRatio {
		// Image is wider
		newWidth = size.Width
		newHeight = int(float64(size.Width) / ratio)
	} else {
		// Image is taller
		newHeight = size.Height
		newWidth = int(float64(size.Height) * ratio)
	}
	
	// Use Lanczos3 for high-quality downsampling
	return imaging.Resize(src, newWidth, newHeight, imaging.Lanczos)
}

// encodeWebP encodes image as WebP (fallback to JPEG since golang.org/x/image/webp doesn't support encoding)
func (o *ImageOptimizer) encodeWebP(w io.Writer, img image.Image) error {
	// golang.org/x/image/webp only supports decoding, not encoding
	// Fall back to JPEG encoding with high quality
	return jpeg.Encode(w, img, &jpeg.Options{
		Quality: o.webpQuality,
	})
}

// encodeJPEG encodes image as JPEG
func (o *ImageOptimizer) encodeJPEG(w io.Writer, img image.Image) error {
	return jpeg.Encode(w, img, &jpeg.Options{
		Quality: o.jpegQuality,
	})
}

// encodePNG encodes image as PNG
func (o *ImageOptimizer) encodePNG(w io.Writer, img image.Image) error {
	encoder := png.Encoder{
		CompressionLevel: o.pngCompression,
	}
	return encoder.Encode(w, img)
}

// saveImage saves processed image to disk
func (o *ImageOptimizer) saveImage(path string, data []byte) error {
	// Ensure directory exists
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	
	// Write file atomically
	tempPath := path + ".tmp"
	if err := os.WriteFile(tempPath, data, 0644); err != nil {
		return err
	}
	
	return os.Rename(tempPath, path)
}

// generateOutputPath creates output file path
func (o *ImageOptimizer) generateOutputPath(itemID, preset, format string) string {
	filename := fmt.Sprintf("%s_%s.%s", itemID, preset, format)
	return filepath.Join(o.cachePath, filename[:2], filename[2:4], filename)
}

// generateSrcSet creates responsive image srcset
func (o *ImageOptimizer) generateSrcSet(results map[string]string) string {
	srcset := ""
	
	sizes := []struct {
		name  string
		width string
	}{
		{"mobile", "375w"},
		{"tablet", "768w"},
		{"medium", "640w"},
		{"large", "1024w"},
		{"full", "1920w"},
	}
	
	for _, size := range sizes {
		if path, ok := results[size.name]; ok {
			if srcset != "" {
				srcset += ", "
			}
			srcset += fmt.Sprintf("%s/%s %s", o.cdnBaseURL, path, size.width)
		}
	}
	
	return srcset
}

// LazyLoadImage generates lazy loading HTML
func (o *ImageOptimizer) LazyLoadImage(itemID string, alt string, className string) string {
	thumbnail := o.generateOutputPath(itemID, "thumbnail", "webp")
	srcset := o.generateSrcSet(map[string]string{
		"mobile": o.generateOutputPath(itemID, "mobile", "webp"),
		"tablet": o.generateOutputPath(itemID, "tablet", "webp"),
		"medium": o.generateOutputPath(itemID, "medium", "webp"),
		"large":  o.generateOutputPath(itemID, "large", "jpeg"),
	})
	
	return fmt.Sprintf(`
		<img 
			src="%s/%s"
			data-srcset="%s"
			alt="%s"
			class="%s lazyload"
			loading="lazy"
			decoding="async"
		/>
	`, o.cdnBaseURL, thumbnail, srcset, alt, className)
}

// OptimizeBatch processes multiple images concurrently
func (o *ImageOptimizer) OptimizeBatch(ctx context.Context, images []string) error {
	semaphore := make(chan struct{}, 4) // Process 4 images concurrently
	var wg sync.WaitGroup
	errors := make([]error, 0)
	var mu sync.Mutex
	
	for _, imagePath := range images {
		wg.Add(1)
		go func(path string) {
			defer wg.Done()
			
			semaphore <- struct{}{}
			defer func() { <-semaphore }()
			
			itemID := uuid.New().String()
			_, err := o.ProcessImage(ctx, path, itemID)
			if err != nil {
				mu.Lock()
				errors = append(errors, err)
				mu.Unlock()
			}
		}(imagePath)
	}
	
	wg.Wait()
	
	if len(errors) > 0 {
		return fmt.Errorf("batch processing had %d errors", len(errors))
	}
	
	return nil
}

// GetCDNURL returns CDN URL for an image
func (o *ImageOptimizer) GetCDNURL(path string) string {
	return fmt.Sprintf("%s/%s", o.cdnBaseURL, path)
}

// PreloadCriticalImages preloads important images
func (o *ImageOptimizer) PreloadCriticalImages(itemIDs []string) {
	for _, itemID := range itemIDs {
		// Preload thumbnails and mobile sizes
		thumbnailPath := o.generateOutputPath(itemID, "thumbnail", "webp")
		mobilePath := o.generateOutputPath(itemID, "mobile", "webp")
		
		o.imageCache.Preload(thumbnailPath)
		o.imageCache.Preload(mobilePath)
	}
}

// CleanupOldImages removes old cached images
func (o *ImageOptimizer) CleanupOldImages(olderThan time.Duration) error {
	cutoff := time.Now().Add(-olderThan)
	
	return filepath.Walk(o.cachePath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		
		if !info.IsDir() && info.ModTime().Before(cutoff) {
			if err := os.Remove(path); err != nil {
				log.Printf("Failed to remove old image %s: %v", path, err)
			}
		}
		
		return nil
	})
}

// NewWorkerPool creates a new worker pool
func NewWorkerPool(workers int) *WorkerPool {
	return &WorkerPool{
		workers:  workers,
		jobQueue: make(chan ImageJob, workers*2),
	}
}

// Start begins processing jobs
func (wp *WorkerPool) Start() {
	for i := 0; i < wp.workers; i++ {
		wp.wg.Add(1)
		go wp.worker()
	}
}

// worker processes jobs from the queue
func (wp *WorkerPool) worker() {
	defer wp.wg.Done()
	
	for job := range wp.jobQueue {
		// Process the job
		err := processImageJob(job)
		if job.OnComplete != nil {
			job.OnComplete(err)
		}
	}
}

// Submit adds a job to the queue
func (wp *WorkerPool) Submit(job ImageJob) {
	wp.jobQueue <- job
}

// Stop gracefully stops the worker pool
func (wp *WorkerPool) Stop() {
	close(wp.jobQueue)
	wp.wg.Wait()
}

func processImageJob(job ImageJob) error {
	// Implementation would process the actual image
	return nil
}

// NewImageCache creates a new image cache
func NewImageCache(maxSize int64) *ImageCache {
	return &ImageCache{
		cache:   make(map[string]*CachedImage),
		maxSize: maxSize,
	}
}

// Get retrieves an image from cache
func (ic *ImageCache) Get(key string) []byte {
	ic.mu.RLock()
	defer ic.mu.RUnlock()
	
	if cached, ok := ic.cache[key]; ok {
		cached.AccessTime = time.Now()
		cached.AccessCount++
		return cached.Data
	}
	
	return nil
}

// Set adds an image to cache
func (ic *ImageCache) Set(key string, data []byte, contentType string) {
	ic.mu.Lock()
	defer ic.mu.Unlock()
	
	size := int64(len(data))
	
	// Evict old entries if needed
	for ic.currentSize+size > ic.maxSize && len(ic.cache) > 0 {
		ic.evictOldest()
	}
	
	ic.cache[key] = &CachedImage{
		Path:        key,
		Data:        data,
		ContentType: contentType,
		Size:        size,
		AccessTime:  time.Now(),
		AccessCount: 1,
	}
	
	ic.currentSize += size
}

// evictOldest removes the least recently used item
func (ic *ImageCache) evictOldest() {
	var oldestKey string
	var oldestTime time.Time
	
	for key, cached := range ic.cache {
		if oldestKey == "" || cached.AccessTime.Before(oldestTime) {
			oldestKey = key
			oldestTime = cached.AccessTime
		}
	}
	
	if oldestKey != "" {
		ic.currentSize -= ic.cache[oldestKey].Size
		delete(ic.cache, oldestKey)
	}
}

// Preload loads an image into cache
func (ic *ImageCache) Preload(path string) {
	// Implementation would load from disk
	// This is a placeholder
}