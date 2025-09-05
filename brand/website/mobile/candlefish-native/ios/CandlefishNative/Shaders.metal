/**
 * Shaders.metal
 * Metal shaders for high-performance fish animation rendering
 */

#include <metal_stdlib>
using namespace metal;

// MARK: - Vertex Structures

struct Vertex {
    float2 position [[attribute(0)]];
};

struct Particle {
    float2 position;
    float2 velocity;
    float life;
    float size;
    int type; // 0=food, 1=bubble
};

struct FishState {
    float2 position;
    float2 velocity;
    float angle;
    float glowIntensity;
    float eyeDilation;
    float finSpread;
    float bodyTension;
    int mood;
};

struct Uniforms {
    float4x4 modelViewProjectionMatrix;
    float time;
    float4 moodColor;
    float2 screenSize;
    FishState fishState;
    float4 qualitySettings; // particleCount, trailLength, enableBloom, textureQuality
};

struct RasterizerData {
    float4 position [[position]];
    float2 textureCoordinate;
    float4 color;
    float size [[point_size]];
    float opacity;
};

// MARK: - Utility Functions

float2 rotate(float2 v, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return float2(v.x * c - v.y * s, v.x * s + v.y * c);
}

float smoothstep_custom(float edge0, float edge1, float x) {
    float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
}

float noise(float2 p) {
    return fract(sin(dot(p, float2(12.9898, 78.233))) * 43758.5453);
}

float fbm(float2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for (int i = 0; i < 4; i++) {
        value += amplitude * noise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    
    return value;
}

// MARK: - Fish Vertex Shader

vertex RasterizerData fishVertexShader(Vertex in [[stage_in]],
                                      constant Uniforms& uniforms [[buffer(1)]],
                                      uint vertexID [[vertex_id]]) {
    RasterizerData out;
    
    // Transform fish vertices relative to fish position and rotation
    float2 localPos = in.position;
    
    // Apply body tension deformation
    float tension = uniforms.fishState.bodyTension;
    localPos.y *= (1.0 - tension * 0.3);
    
    // Apply fin spread for side fins
    if (vertexID >= 22 && vertexID < 26) { // Tail vertices
        float spread = uniforms.fishState.finSpread;
        localPos.y *= (1.0 + spread * 0.5);
    }
    
    // Rotate around fish angle
    localPos = rotate(localPos, uniforms.fishState.angle);
    
    // Translate to fish position
    float2 worldPos = localPos + uniforms.fishState.position;
    
    // Apply projection matrix
    out.position = uniforms.modelViewProjectionMatrix * float4(worldPos, 0.0, 1.0);
    
    // Texture coordinates (UV mapping for fish body)
    out.textureCoordinate = (in.position + float2(20.0, 10.0)) / float2(40.0, 20.0);
    
    // Set color based on mood
    out.color = uniforms.moodColor;
    
    // Glow intensity affects opacity
    out.opacity = uniforms.fishState.glowIntensity;
    
    return out;
}

// MARK: - Fish Fragment Shader

fragment float4 fishFragmentShader(RasterizerData in [[stage_in]],
                                  texture2d<float> glowTexture [[texture(0)]],
                                  texture2d<float> noiseTexture [[texture(1)]],
                                  constant Uniforms& uniforms [[buffer(0)]]) {
    constexpr sampler textureSampler(mag_filter::linear, min_filter::linear);
    
    float4 color = in.color;
    
    // Sample glow texture for organic luminescence
    float2 glowUV = in.textureCoordinate;
    float4 glowSample = glowTexture.sample(textureSampler, glowUV);
    
    // Sample noise for organic texture
    float2 noiseUV = in.textureCoordinate * 4.0 + uniforms.time * 0.1;
    float noiseSample = noiseTexture.sample(textureSampler, noiseUV).r;
    
    // Combine base color with glow and noise
    color.rgb = mix(color.rgb * 0.6, color.rgb, glowSample.a);
    color.rgb += color.rgb * noiseSample * 0.2;
    
    // Apply glow intensity
    color.a *= in.opacity * glowSample.a;
    
    // Add subtle pulsing based on mood
    float pulse = sin(uniforms.time * 3.0) * 0.1 + 0.9;
    color.rgb *= pulse;
    
    // Mood-specific effects
    switch (uniforms.fishState.mood) {
        case 3: // excited
            // Add sparkle effect
            float sparkle = fbm(in.textureCoordinate * 20.0 + uniforms.time * 5.0);
            color.rgb += sparkle * 0.3;
            break;
            
        case 2: // shy
            // Reduce overall intensity
            color.a *= 0.7;
            break;
            
        case 5: // lonely
            // Desaturate color
            float luminance = dot(color.rgb, float3(0.299, 0.587, 0.114));
            color.rgb = mix(color.rgb, float3(luminance), 0.3);
            break;
    }
    
    return color;
}

// MARK: - Particle Vertex Shader

vertex RasterizerData particleVertexShader(uint vertexID [[vertex_id]],
                                          constant Particle* particles [[buffer(0)]],
                                          constant Uniforms& uniforms [[buffer(1)]]) {
    RasterizerData out;
    
    Particle particle = particles[vertexID];
    
    // Skip dead particles
    if (particle.life <= 0.0) {
        out.position = float4(-1000, -1000, 0, 1); // Off-screen
        out.size = 0.0;
        out.opacity = 0.0;
        return out;
    }
    
    // Apply projection matrix
    out.position = uniforms.modelViewProjectionMatrix * float4(particle.position, 0.0, 1.0);
    
    // Set point size based on particle size and distance to fish
    float distToFish = length(particle.position - uniforms.fishState.position);
    float sizeMod = 1.0 + smoothstep_custom(0.0, 50.0, 50.0 - distToFish) * 0.5;
    out.size = particle.size * sizeMod;
    
    // Set color based on particle type
    if (particle.type == 0) { // Food particle
        out.color = float4(1.0, 0.9, 0.2, 1.0); // Golden food
    } else { // Bubble
        out.color = uniforms.moodColor;
        out.color.a *= 0.3;
    }
    
    // Fade based on life
    out.opacity = particle.life / 5.0; // Assuming max life of 5 seconds
    
    // Texture coordinates for point sprite
    out.textureCoordinate = float2(0.5, 0.5); // Center
    
    return out;
}

// MARK: - Particle Fragment Shader

fragment float4 particleFragmentShader(RasterizerData in [[stage_in]],
                                      float2 pointCoord [[point_coord]],
                                      constant Uniforms& uniforms [[buffer(0)]]) {
    float4 color = in.color;
    
    // Create circular particle
    float2 circleCoord = (pointCoord - 0.5) * 2.0;
    float distance = length(circleCoord);
    
    if (distance > 1.0) {
        discard_fragment();
    }
    
    // Soft edge falloff
    float alpha = 1.0 - smoothstep_custom(0.7, 1.0, distance);
    color.a *= alpha * in.opacity;
    
    // Add sparkle effect to food particles
    float sparkle = fbm(pointCoord * 10.0 + uniforms.time * 3.0);
    color.rgb += sparkle * 0.2;
    
    // Add glow effect
    color.rgb += color.rgb * (1.0 - distance) * 0.5;
    
    return color;
}

// MARK: - Trail Vertex Shader

vertex RasterizerData trailVertexShader(Vertex in [[stage_in]],
                                       constant Uniforms& uniforms [[buffer(1)]],
                                       uint vertexID [[vertex_id]]) {
    RasterizerData out;
    
    // Apply projection matrix
    out.position = uniforms.modelViewProjectionMatrix * float4(in.position, 0.0, 1.0);
    
    // Set color based on mood with fadeout along trail
    float fadeout = 1.0 - (float(vertexID) / uniforms.qualitySettings.y); // Trail length
    out.color = uniforms.moodColor;
    out.opacity = fadeout * 0.4; // Trail is more transparent than fish
    
    // No texture coordinates needed for trail
    out.textureCoordinate = float2(0, 0);
    
    return out;
}

// MARK: - Trail Fragment Shader

fragment float4 trailFragmentShader(RasterizerData in [[stage_in]],
                                   constant Uniforms& uniforms [[buffer(0)]]) {
    float4 color = in.color;
    color.a *= in.opacity;
    
    // Add subtle glow
    color.rgb *= 1.2;
    
    // Mood-specific trail effects
    switch (uniforms.fishState.mood) {
        case 1: // playful
            // Wavy trail effect
            float wave = sin(uniforms.time * 5.0) * 0.1 + 1.0;
            color.rgb *= wave;
            break;
            
        case 3: // excited
            // Brighter, more intense trail
            color.rgb *= 1.5;
            color.a *= 1.3;
            break;
    }
    
    return color;
}

// MARK: - Ripple Vertex Shader

vertex RasterizerData rippleVertexShader(Vertex in [[stage_in]],
                                        constant Uniforms& uniforms [[buffer(1)]],
                                        constant float3* rippleData [[buffer(2)]], // center.xy, radius
                                        uint instanceID [[instance_id]]) {
    RasterizerData out;
    
    float3 ripple = rippleData[instanceID]; // center.x, center.y, radius
    
    // Create circle vertices
    float angle = float(in.position.x) / 360.0 * 2.0 * M_PI_F;
    float2 circlePos = float2(cos(angle), sin(angle)) * ripple.z;
    float2 worldPos = circlePos + ripple.xy;
    
    // Apply projection matrix
    out.position = uniforms.modelViewProjectionMatrix * float4(worldPos, 0.0, 1.0);
    
    // Set color based on mood
    out.color = uniforms.moodColor;
    out.opacity = smoothstep_custom(0.0, 100.0, 100.0 - ripple.z); // Fade as ripple expands
    
    return out;
}

// MARK: - Ripple Fragment Shader

fragment float4 rippleFragmentShader(RasterizerData in [[stage_in]]) {
    float4 color = in.color;
    color.a *= in.opacity * 0.6; // Ripples are semi-transparent
    
    return color;
}

// MARK: - Compute Shader for Particle Physics

kernel void particleComputeShader(uint id [[thread_position_in_grid]],
                                 device Particle* particles [[buffer(0)]],
                                 constant Uniforms& uniforms [[buffer(1)]]) {
    if (id >= uint(uniforms.qualitySettings.x)) return; // Particle count
    
    Particle particle = particles[id];
    
    if (particle.life <= 0.0) return;
    
    float deltaTime = 1.0 / 60.0; // Assume 60 FPS
    
    // Update position
    particle.position += particle.velocity * deltaTime;
    
    // Apply gravity to food particles
    if (particle.type == 0) {
        particle.velocity.y += 50.0 * deltaTime;
    } else {
        // Bubbles float up
        particle.velocity.y -= 30.0 * deltaTime;
    }
    
    // Check if particle is consumed by fish
    float distToFish = length(particle.position - uniforms.fishState.position);
    if (distToFish < 15.0 && particle.type == 0) {
        particle.life = 0.0; // Mark as consumed
    }
    
    // Update life
    particle.life -= deltaTime;
    
    // Boundary checking - remove particles that go off screen
    if (particle.position.x < -50.0 || particle.position.x > uniforms.screenSize.x + 50.0 ||
        particle.position.y < -50.0 || particle.position.y > uniforms.screenSize.y + 50.0) {
        particle.life = 0.0;
    }
    
    particles[id] = particle;
}

// MARK: - Post-Processing Bloom Shader (if quality allows)

vertex RasterizerData bloomVertexShader(Vertex in [[stage_in]]) {
    RasterizerData out;
    out.position = float4(in.position, 0.0, 1.0);
    out.textureCoordinate = (in.position + 1.0) * 0.5; // Convert from [-1,1] to [0,1]
    return out;
}

fragment float4 bloomFragmentShader(RasterizerData in [[stage_in]],
                                   texture2d<float> sourceTexture [[texture(0)]],
                                   constant Uniforms& uniforms [[buffer(0)]]) {
    constexpr sampler textureSampler(mag_filter::linear, min_filter::linear);
    
    if (uniforms.qualitySettings.z < 0.5) { // Bloom disabled
        return sourceTexture.sample(textureSampler, in.textureCoordinate);
    }
    
    float4 color = sourceTexture.sample(textureSampler, in.textureCoordinate);
    
    // Extract bright areas
    float brightness = dot(color.rgb, float3(0.2126, 0.7152, 0.0722));
    if (brightness > 0.7) {
        // Apply gaussian blur
        float2 texelSize = 1.0 / float2(uniforms.screenSize);
        float4 bloom = float4(0.0);
        
        // Simple 3x3 blur kernel
        for (int x = -1; x <= 1; x++) {
            for (int y = -1; y <= 1; y++) {
                float2 offset = float2(x, y) * texelSize * 2.0;
                bloom += sourceTexture.sample(textureSampler, in.textureCoordinate + offset);
            }
        }
        bloom /= 9.0;
        
        // Add bloom to original
        color.rgb += bloom.rgb * 0.3;
    }
    
    return color;
}