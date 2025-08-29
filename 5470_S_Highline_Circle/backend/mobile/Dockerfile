# React Native mobile app builder
FROM node:20-alpine AS base

# Install build dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    openjdk17-jdk \
    android-tools \
    curl \
    bash

# Set JAVA_HOME
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk

# Install Android SDK
ENV ANDROID_HOME=/opt/android-sdk
ENV ANDROID_SDK_ROOT=$ANDROID_HOME
ENV PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin

RUN mkdir -p $ANDROID_HOME && \
    cd $ANDROID_HOME && \
    curl -o cmdline-tools.zip https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip && \
    unzip cmdline-tools.zip && \
    rm cmdline-tools.zip && \
    mkdir -p cmdline-tools/latest && \
    mv cmdline-tools/* cmdline-tools/latest/ || true

# Accept Android licenses
RUN yes | sdkmanager --licenses || true
RUN sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0"

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock* ./

# Install dependencies
RUN npm install -g @react-native-community/cli expo-cli eas-cli
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build scripts for different platforms
COPY <<EOF /app/build-android.sh
#!/bin/bash
set -e
echo "Building Android APK..."
cd android
./gradlew assembleRelease
cp app/build/outputs/apk/release/app-release.apk /app/dist/app-release.apk
echo "Android APK built successfully"
EOF

COPY <<EOF /app/build-ios.sh
#!/bin/bash
set -e
echo "iOS build requires macOS and Xcode"
echo "Use Expo build service or CI/CD pipeline on macOS runner"
exit 1
EOF

# Make build scripts executable
RUN chmod +x /app/build-android.sh /app/build-ios.sh

# Create dist directory
RUN mkdir -p /app/dist

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node --version && npm --version || exit 1

# Default command
CMD ["npm", "start"]