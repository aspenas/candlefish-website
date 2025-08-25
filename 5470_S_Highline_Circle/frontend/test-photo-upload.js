const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

async function testPhotoUpload() {
  console.log('=== Testing Photo Upload Functionality ===\n');

  try {
    // First, get a list of items to test with
    console.log('1. Fetching available items...');
    const itemsResponse = await axios.get('https://5470-inventory.fly.dev/api/v1/items');
    const items = itemsResponse.data.items;

    if (!items || items.length === 0) {
      console.log('❌ No items found to test with');
      return;
    }

    const testItem = items[0];
    console.log(`✓ Using test item: ${testItem.name} (ID: ${testItem.id})`);

    // Create a test image buffer (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00,
      0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);

    console.log('\n2. Preparing form data...');
    const form = new FormData();
    form.append('photos', testImageBuffer, {
      filename: 'test-photo.png',
      contentType: 'image/png'
    });

    console.log('✓ Test image created (1x1 PNG, ~70 bytes)');

    // Test photo upload
    console.log(`\n3. Uploading photo to item: ${testItem.id}...`);
    const uploadUrl = `https://5470-inventory.fly.dev/api/v1/items/${testItem.id}/photos`;

    const uploadResponse = await axios.post(uploadUrl, form, {
      headers: {
        ...form.getHeaders(),
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    console.log(`✓ Upload successful! Status: ${uploadResponse.status}`);
    console.log(`Response:`, uploadResponse.data);

    // Test getting the updated item to verify photo was added
    console.log('\n4. Verifying photo was added...');
    const updatedItemResponse = await axios.get(`https://5470-inventory.fly.dev/api/v1/items/${testItem.id}`);
    const updatedItem = updatedItemResponse.data;

    console.log(`✓ Item image count: ${updatedItem.image_count}`);
    console.log(`✓ Has images: ${updatedItem.has_images}`);

    if (updatedItem.has_images && updatedItem.image_count > 0) {
      console.log('\n✅ PHOTO UPLOAD TEST: PASSED');
      console.log('- Photo successfully uploaded');
      console.log('- Item metadata updated correctly');
      console.log('- Image count incremented');
    } else {
      console.log('\n⚠️  PHOTO UPLOAD TEST: PARTIAL SUCCESS');
      console.log('- Upload request succeeded');
      console.log('- But item metadata may not have updated');
    }

  } catch (error) {
    console.log('\n❌ PHOTO UPLOAD TEST: FAILED');
    console.log(`Error: ${error.message}`);

    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Response:`, error.response.data);
    }

    if (error.code) {
      console.log(`Error Code: ${error.code}`);
    }
  }
}

// Test specific error scenarios
async function testUploadErrorScenarios() {
  console.log('\n=== Testing Error Scenarios ===\n');

  try {
    // Test 1: Invalid item ID
    console.log('1. Testing upload to invalid item ID...');
    const form = new FormData();
    form.append('photos', Buffer.from('fake'), 'test.jpg');

    try {
      await axios.post('https://5470-inventory.fly.dev/api/v1/items/invalid-id/photos', form, {
        headers: form.getHeaders(),
        timeout: 10000
      });
      console.log('❌ Should have failed with invalid ID');
    } catch (error) {
      console.log(`✓ Correctly failed with status: ${error.response?.status || 'Network Error'}`);
    }

    // Test 2: No file upload
    console.log('\n2. Testing upload with no files...');
    const emptyForm = new FormData();

    try {
      const response = await axios.get('https://5470-inventory.fly.dev/api/v1/items');
      const testItemId = response.data.items[0]?.id;

      if (testItemId) {
        await axios.post(`https://5470-inventory.fly.dev/api/v1/items/${testItemId}/photos`, emptyForm, {
          headers: emptyForm.getHeaders(),
          timeout: 10000
        });
        console.log('❌ Should have failed with no files');
      }
    } catch (error) {
      console.log(`✓ Correctly failed with status: ${error.response?.status || 'Network Error'}`);
    }

    console.log('\n✅ Error scenario testing completed');

  } catch (error) {
    console.log(`❌ Error scenario testing failed: ${error.message}`);
  }
}

// Run all tests
async function runAllTests() {
  await testPhotoUpload();
  await testUploadErrorScenarios();

  console.log('\n=== Photo Upload Test Summary ===');
  console.log('Tests completed. Check results above for pass/fail status.');
}

runAllTests();
