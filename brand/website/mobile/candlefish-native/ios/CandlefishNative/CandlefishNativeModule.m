/**
 * CandlefishNativeModule.m
 * React Native bridge for iOS Metal-based fish renderer
 */

#import <React/RCTBridgeModule.h>
#import <React/RCTViewManager.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(CandlefishNativeModule, RCTEventEmitter)

// MARK: - Configuration Methods
RCT_EXTERN_METHOD(initialize:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(setQualityTier:(NSString *)tier
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(enableHaptics:(BOOL)enabled
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(enableMotionSensors:(BOOL)enabled
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// MARK: - Interaction Methods
RCT_EXTERN_METHOD(handleTouch:(NSDictionary *)touchData
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(feedFish:(NSDictionary *)position
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getFishState:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// MARK: - Performance Methods
RCT_EXTERN_METHOD(getPerformanceMetrics:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(startPerformanceMonitoring:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stopPerformanceMonitoring:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// MARK: - Lifecycle Methods
RCT_EXTERN_METHOD(start:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stop:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(dispose:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
    return YES;
}

@end

@interface RCT_EXTERN_MODULE(CandlefishNativeViewManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(qualityTier, NSString)
RCT_EXPORT_VIEW_PROPERTY(enableHaptics, BOOL)
RCT_EXPORT_VIEW_PROPERTY(enableMotion, BOOL)
RCT_EXPORT_VIEW_PROPERTY(adaptiveQuality, BOOL)
RCT_EXPORT_VIEW_PROPERTY(onFishStateChange, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onPerformanceUpdate, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onTouch, RCTBubblingEventBlock)

@end