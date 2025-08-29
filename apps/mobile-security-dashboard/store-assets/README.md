# Store Assets for Mobile Security Dashboard

This directory contains all assets and metadata required for app store submissions.

## App Store Connect (iOS)

### Required Assets
- **App Icon**: 1024x1024px (app-icon-1024.png)
- **Screenshots**: Various iPhone and iPad sizes
- **App Preview Videos**: Optional promotional videos
- **Metadata**: app-store-metadata.json

### Screenshot Requirements

#### iPhone 6.7" (iPhone 14 Pro Max, 15 Pro Max)
- Resolution: 1290 x 2796 pixels
- Format: PNG or JPEG
- RGB color space
- Required: 3-10 screenshots

#### iPhone 6.5" (iPhone 14 Plus, 15 Plus, etc.)  
- Resolution: 1242 x 2688 pixels
- Format: PNG or JPEG
- RGB color space
- Required: 3-10 screenshots

#### iPhone 5.5" (iPhone 8 Plus)
- Resolution: 1242 x 2208 pixels
- Format: PNG or JPEG  
- RGB color space
- Optional but recommended

#### iPad Pro 12.9" (6th generation)
- Resolution: 2048 x 2732 pixels
- Format: PNG or JPEG
- RGB color space  
- Required: 3-10 screenshots

### App Preview Video Requirements
- Length: 15-30 seconds
- Resolution: Match screenshot dimensions
- Format: M4V, MP4, or MOV
- Aspect ratio: Match device orientation

## Google Play Console (Android)

### Required Assets
- **App Icon**: 512x512px (google-play-icon-512.png)
- **Feature Graphic**: 1024x500px (feature-graphic-1024x500.png)
- **Screenshots**: Phone and tablet versions
- **Metadata**: google-play-metadata.json

### Screenshot Requirements

#### Phone Screenshots
- Resolution: 1080 x 1920 pixels (portrait) or 1920 x 1080 pixels (landscape)
- Format: PNG or JPEG
- 16:9 or 9:16 aspect ratio
- Required: 2-8 screenshots

#### 7" Tablet Screenshots  
- Resolution: 1200 x 1920 pixels (portrait) or 1920 x 1200 pixels (landscape)
- Format: PNG or JPEG
- Required: 1-8 screenshots

#### 10" Tablet Screenshots
- Resolution: 1800 x 2560 pixels (portrait) or 2560 x 1800 pixels (landscape)  
- Format: PNG or JPEG
- Optional but recommended

### Feature Graphic
- Resolution: 1024 x 500 pixels
- Format: PNG or JPEG
- No text overlay (handled by Google Play)
- Showcases app functionality

### Promotional Video
- YouTube URL
- Length: 30 seconds - 2 minutes
- Should demonstrate key app features

## Asset Generation Scripts

### Generate All Assets
```bash
# Generate all required store assets
npm run generate-assets

# Generate only iOS assets  
npm run generate-assets:ios

# Generate only Android assets
npm run generate-assets:android
```

### Screenshot Automation
```bash
# Generate screenshots using simulator/emulator
npm run screenshots:generate

# Optimize existing screenshots
npm run screenshots:optimize
```

## Asset Checklist

### iOS (App Store Connect)
- [ ] App icon (1024x1024)
- [ ] iPhone 6.7" screenshots (3-10)
- [ ] iPhone 6.5" screenshots (3-10) 
- [ ] iPad Pro screenshots (3-10)
- [ ] App preview video (optional)
- [ ] App Store metadata
- [ ] Privacy policy URL
- [ ] Support URL

### Android (Google Play Console)
- [ ] App icon (512x512)
- [ ] Feature graphic (1024x500)
- [ ] Phone screenshots (2-8)
- [ ] 7" tablet screenshots (1-8)
- [ ] 10" tablet screenshots (optional)
- [ ] Promotional video (YouTube)
- [ ] Google Play metadata
- [ ] Privacy policy URL
- [ ] Content rating questionnaire

## Content Guidelines

### Screenshots Should Show:
1. **Main Dashboard**: Security monitoring interface
2. **Alert Management**: Security alerts and notifications  
3. **Incident Response**: Detailed incident investigation
4. **Authentication**: Biometric login screen
5. **Analytics**: Security metrics and charts
6. **Team Collaboration**: Multi-user features
7. **Settings**: Configuration and preferences
8. **Offline Mode**: Offline capabilities demonstration

### Text Guidelines:
- No profanity or inappropriate content
- Accurate feature descriptions
- Professional business language
- Clear value propositions
- Compliance with store policies

## Localization

### Supported Languages:
- English (Primary)
- Spanish
- French  
- German
- Japanese
- Chinese (Simplified)

### Localized Assets:
Each language should have:
- Translated screenshots with localized UI
- Localized app descriptions
- Localized keywords and metadata
- Localized support materials

## Quality Assurance

### Before Submission:
1. Verify all assets meet size requirements
2. Check for proper aspect ratios
3. Ensure no sensitive data in screenshots
4. Validate all URLs work correctly
5. Test metadata character limits
6. Review content for accuracy
7. Check compliance with store policies

### Asset Validation:
```bash
# Validate all assets meet requirements
npm run validate-assets

# Check image dimensions and formats
npm run check-images

# Verify metadata completeness  
npm run check-metadata
```

## Submission Process

### iOS Submission:
1. Upload assets to App Store Connect
2. Configure app information and metadata
3. Set pricing and availability
4. Submit for App Store review
5. Respond to any review feedback
6. Release when approved

### Android Submission:  
1. Upload assets to Google Play Console
2. Configure store listing information
3. Set up app releases and testing
4. Submit for Google Play review
5. Monitor pre-launch report
6. Release to production

## Support and Resources

- **App Store Connect Help**: https://help.apple.com/app-store-connect/
- **Google Play Console Help**: https://support.google.com/googleplay/android-developer/
- **Design Guidelines**: 
  - iOS: https://developer.apple.com/design/human-interface-guidelines/
  - Android: https://material.io/design
- **Asset Templates**: Available in `/templates` directory
- **Support Contact**: security-support@candlefish.ai

## Version History

### v1.0.0 (Initial Release)
- Created comprehensive store assets
- Established content guidelines  
- Set up localization framework
- Implemented quality assurance process

Generated on: August 27, 2025