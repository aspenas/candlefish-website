/**
 * Photo Batch Capture Client Example
 *
 * This example demonstrates how to use the photo batch capture API
 * from a frontend application (React, Vue, vanilla JS, etc.)
 */

class PhotoBatchClient {
    constructor(baseUrl = 'http://localhost:8080/api/v1') {
        this.baseUrl = baseUrl;
        this.wsUrl = 'ws://localhost:8080/ws/photos';
        this.ws = null;
        this.currentSession = null;
    }

    /**
     * Connect to WebSocket for real-time updates
     */
    async connectWebSocket() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.wsUrl);

            this.ws.onopen = () => {
                console.log('📡 WebSocket connected');
                resolve();
            };

            this.ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                this.handleWebSocketMessage(message);
            };

            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                reject(error);
            };

            this.ws.onclose = () => {
                console.log('📡 WebSocket disconnected');
            };
        });
    }

    /**
     * Handle incoming WebSocket messages
     */
    handleWebSocketMessage(message) {
        console.log('📨 WebSocket message:', message);

        switch (message.type) {
            case 'photo_uploaded':
                this.onPhotoUploaded(message.data);
                break;
            case 'photo_processed':
                this.onPhotoProcessed(message.data);
                break;
            case 'session_updated':
                this.onSessionUpdated(message.data);
                break;
            case 'progress_updated':
                this.onProgressUpdated(message.data);
                break;
        }
    }

    /**
     * Create a new photo session
     */
    async createSession(roomId = null, name = 'Photo Session', description = '') {
        const response = await fetch(`${this.baseUrl}/photos/sessions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                room_id: roomId,
                name: name,
                description: description
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to create session: ${response.statusText}`);
        }

        this.currentSession = await response.json();
        console.log('✅ Session created:', this.currentSession);
        return this.currentSession;
    }

    /**
     * Upload photos for a specific item
     */
    async uploadItemPhotos(itemId, files, options = {}) {
        const formData = new FormData();

        // Add files
        files.forEach(file => {
            formData.append('photos', file);
        });

        // Add optional parameters
        if (this.currentSession?.id) {
            formData.append('session_id', this.currentSession.id);
        }
        if (options.angle) {
            formData.append('angle', options.angle);
        }
        if (options.caption) {
            formData.append('caption', options.caption);
        }
        if (options.isPrimary) {
            formData.append('is_primary', 'true');
        }

        const response = await fetch(`${this.baseUrl}/items/${itemId}/photos`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Failed to upload photos: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ Photos uploaded:', result);
        return result;
    }

    /**
     * Batch upload multiple photos with individual metadata
     */
    async batchUploadPhotos(sessionId, photosWithMetadata) {
        const formData = new FormData();

        // Add files and metadata
        photosWithMetadata.forEach((item, index) => {
            formData.append('photos', item.file);

            if (item.itemId) {
                formData.append(`item_ids[${index}]`, item.itemId);
            }
            if (item.angle) {
                formData.append(`angles[${index}]`, item.angle);
            }
            if (item.caption) {
                formData.append(`captions[${index}]`, item.caption);
            }
            if (item.isPrimary) {
                formData.append(`is_primary[${index}]`, 'true');
            }
        });

        const response = await fetch(`${this.baseUrl}/photos/batch/${sessionId}`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Failed to batch upload: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ Batch upload completed:', result);
        return result;
    }

    /**
     * Get room photo progress
     */
    async getRoomProgress() {
        const response = await fetch(`${this.baseUrl}/rooms/progress`);

        if (!response.ok) {
            throw new Error(`Failed to get progress: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('📊 Room progress:', result);
        return result;
    }

    /**
     * Update session status
     */
    async updateSession(sessionId, updates) {
        const response = await fetch(`${this.baseUrl}/photos/sessions/${sessionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            throw new Error(`Failed to update session: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ Session updated:', result);
        return result;
    }

    /**
     * Complete current session
     */
    async completeSession() {
        if (!this.currentSession) {
            throw new Error('No active session');
        }

        return this.updateSession(this.currentSession.id, { status: 'completed' });
    }

    /**
     * Get photo URL for display
     */
    getPhotoUrl(filename, resolution = 'web') {
        return `${this.baseUrl}/photos/${resolution}/${filename}`;
    }

    // Event handlers - override these in your implementation
    onPhotoUploaded(data) {
        console.log('📸 Photo uploaded:', data);
    }

    onPhotoProcessed(data) {
        console.log('🔄 Photo processed:', data);
    }

    onSessionUpdated(data) {
        console.log('📝 Session updated:', data);
        if (this.currentSession && data.id === this.currentSession.id) {
            this.currentSession = { ...this.currentSession, ...data };
        }
    }

    onProgressUpdated(data) {
        console.log('📊 Progress updated:', data);
    }
}

/**
 * Usage Example
 */
async function exampleUsage() {
    const client = new PhotoBatchClient();

    try {
        // Connect WebSocket for real-time updates
        await client.connectWebSocket();

        // Create a photo session
        const session = await client.createSession(
            'living-room-uuid',
            'Living Room Photos',
            'Capturing all furniture items in living room'
        );

        // Example: Upload photos for a specific sofa item
        const sofaPhotos = [
            new File(['fake-data'], 'sofa-front.jpg', { type: 'image/jpeg' }),
            new File(['fake-data'], 'sofa-back.jpg', { type: 'image/jpeg' })
        ];

        await client.uploadItemPhotos('sofa-uuid', sofaPhotos, {
            angle: 'front',
            caption: 'West Elm sectional sofa',
            isPrimary: true
        });

        // Example: Batch upload multiple photos with metadata
        const batchPhotos = [
            {
                file: new File(['fake-data'], 'IMG_001.jpg', { type: 'image/jpeg' }),
                itemId: 'coffee-table-uuid',
                angle: 'overview',
                caption: 'Glass coffee table'
            },
            {
                file: new File(['fake-data'], 'IMG_002.jpg', { type: 'image/jpeg' }),
                itemId: 'lamp-uuid',
                angle: 'detail',
                caption: 'Table lamp close-up'
            }
        ];

        await client.batchUploadPhotos(session.id, batchPhotos);

        // Check progress
        const progress = await client.getRoomProgress();
        console.log('Current progress:', progress);

        // Complete the session
        await client.completeSession();

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

/**
 * iPhone Photo Capture Integration Example
 *
 * This would be used in a mobile web app or PWA for iPhone photo capture
 */
class iPhonePhotoCapture extends PhotoBatchClient {
    constructor() {
        super();
        this.uploadQueue = [];
        this.isOnline = navigator.onLine;
        this.setupOfflineHandling();
    }

    /**
     * Setup offline handling
     */
    setupOfflineHandling() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processUploadQueue();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    /**
     * Capture photo using device camera
     */
    async capturePhoto() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.capture = 'environment'; // Use rear camera

            input.onchange = (event) => {
                const file = event.target.files[0];
                if (file) {
                    resolve(file);
                } else {
                    reject(new Error('No photo captured'));
                }
            };

            input.click();
        });
    }

    /**
     * Auto-upload photo with queue support for offline mode
     */
    async autoUploadPhoto(itemId, options = {}) {
        try {
            const photoFile = await this.capturePhoto();

            const uploadItem = {
                itemId,
                file: photoFile,
                options,
                timestamp: Date.now()
            };

            if (this.isOnline) {
                await this.uploadItemPhotos(itemId, [photoFile], options);
            } else {
                // Queue for later upload
                this.uploadQueue.push(uploadItem);
                console.log('📱 Photo queued for upload when online');
            }

        } catch (error) {
            console.error('❌ Photo capture failed:', error);
            throw error;
        }
    }

    /**
     * Process queued uploads when back online
     */
    async processUploadQueue() {
        console.log('📤 Processing upload queue...');

        while (this.uploadQueue.length > 0) {
            const item = this.uploadQueue.shift();
            try {
                await this.uploadItemPhotos(item.itemId, [item.file], item.options);
                console.log('✅ Queued photo uploaded');
            } catch (error) {
                console.error('❌ Failed to upload queued photo:', error);
                // Re-queue the item
                this.uploadQueue.unshift(item);
                break;
            }
        }
    }

    /**
     * Override progress handler for mobile UI updates
     */
    onProgressUpdated(data) {
        super.onProgressUpdated(data);

        // Update mobile UI progress bar
        const progressBar = document.getElementById('photo-progress');
        if (progressBar && data.completion_rate !== undefined) {
            progressBar.style.width = `${data.completion_rate}%`;
            progressBar.textContent = `${Math.round(data.completion_rate)}% Complete`;
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PhotoBatchClient, iPhonePhotoCapture };
}

// For browser global usage
if (typeof window !== 'undefined') {
    window.PhotoBatchClient = PhotoBatchClient;
    window.iPhonePhotoCapture = iPhonePhotoCapture;
}
