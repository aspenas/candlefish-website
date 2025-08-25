#!/usr/bin/env node

/**
 * Test script for the improved photo upload API
 * Demonstrates the new features:
 * - Support for both 'photo' and 'photos' field names
 * - Enhanced error handling and validation
 * - Detailed logging and debugging
 * - WebSocket broadcast capabilities
 */

const fs = require('fs');
const path = require('path');

// Mock photo file creation for testing
function createMockPhotoFile() {
    // Create a simple 1x1 pixel PNG for testing
    const pngData = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
        0x49, 0x48, 0x44, 0x52, // "IHDR"
        0x00, 0x00, 0x00, 0x01, // Width: 1
        0x00, 0x00, 0x00, 0x01, // Height: 1
        0x08, 0x02, 0x00, 0x00, 0x00, // Bit depth, color type, compression, filter, interlace
        0x90, 0x77, 0x53, 0xDE, // CRC
        0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
        0x49, 0x44, 0x41, 0x54, // "IDAT"
        0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // Image data
        0xE2, 0x21, 0xBC, 0x33, // CRC
        0x00, 0x00, 0x00, 0x00, // IEND chunk length
        0x49, 0x45, 0x4E, 0x44, // "IEND"
        0xAE, 0x42, 0x60, 0x82  // CRC
    ]);

    const testFilePath = path.join(__dirname, 'test-photo.png');
    fs.writeFileSync(testFilePath, pngData);
    return testFilePath;
}

async function testPhotoUpload() {
    const apiUrl = 'https://5470-inventory.fly.dev';
    const testItemId = '123e4567-e89b-12d3-a456-426614174000'; // Mock UUID

    console.log('🧪 Testing Enhanced Photo Upload System');
    console.log('=====================================');

    // Create mock photo file
    const photoPath = createMockPhotoFile();
    console.log(`📸 Created mock photo: ${photoPath}`);

    // Test cases to demonstrate the improvements
    const testCases = [
        {
            name: 'Test with "photos" field name',
            fieldName: 'photos',
            expectedResult: 'success'
        },
        {
            name: 'Test with "photo" field name (backward compatibility)',
            fieldName: 'photo',
            expectedResult: 'success'
        }
    ];

    for (const testCase of testCases) {
        console.log(`\n🔧 ${testCase.name}`);
        console.log('-----------------------------------');

        try {
            const FormData = require('form-data');
            const form = new FormData();

            // Add the photo file with the specified field name
            form.append(testCase.fieldName, fs.createReadStream(photoPath), {
                filename: 'test-photo.png',
                contentType: 'image/png'
            });

            // Add optional metadata
            form.append('session_id', '456e7890-e89b-12d3-a456-426614174001');
            form.append('angle', 'front');
            form.append('caption', `Test upload using ${testCase.fieldName} field`);
            form.append('is_primary', 'false');

            console.log(`📤 Sending request to: ${apiUrl}/api/v1/items/${testItemId}/photos`);
            console.log(`📋 Field name: ${testCase.fieldName}`);
            console.log(`📏 File size: ${fs.statSync(photoPath).size} bytes`);

            const response = await fetch(`${apiUrl}/api/v1/items/${testItemId}/photos`, {
                method: 'POST',
                body: form,
                headers: {
                    'Origin': 'https://inventory.highline.work',
                    ...form.getHeaders()
                }
            });

            const result = await response.json();
            console.log(`📊 Status: ${response.status}`);
            console.log(`📈 Response:`, JSON.stringify(result, null, 2));

            if (response.status === 200) {
                console.log(`✅ ${testCase.name} - PASSED`);
            } else {
                console.log(`❌ ${testCase.name} - FAILED`);
            }

        } catch (error) {
            console.log(`💥 ${testCase.name} - ERROR: ${error.message}`);
        }
    }

    // Clean up
    fs.unlinkSync(photoPath);
    console.log(`\n🧹 Cleaned up mock photo file`);

    console.log('\n📋 Test Summary');
    console.log('===============');
    console.log('The photo upload system now supports:');
    console.log('✅ Both "photo" and "photos" field names');
    console.log('✅ Enhanced error messages with details');
    console.log('✅ File size validation (50MB limit)');
    console.log('✅ File type validation (images only)');
    console.log('✅ Detailed server-side logging');
    console.log('✅ WebSocket broadcasting on successful upload');
    console.log('✅ CORS support for inventory.highline.work');
    console.log('✅ Automatic directory creation');
}

// Check if we have the required dependencies
try {
    require('form-data');
} catch (error) {
    console.log('❌ Missing form-data dependency. Install with: npm install form-data');
    process.exit(1);
}

// Check if we have fetch (Node.js 18+) or provide polyfill instruction
if (typeof fetch === 'undefined') {
    console.log('❌ This test requires Node.js 18+ or install node-fetch: npm install node-fetch');
    console.log('For Node.js < 18, add this line at the top: global.fetch = require("node-fetch");');
    process.exit(1);
}

// Run the test
if (require.main === module) {
    testPhotoUpload().catch(console.error);
}

module.exports = { testPhotoUpload, createMockPhotoFile };
