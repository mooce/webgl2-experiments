#ifndef LIGHTS
#define LIGHTS 1
#endif
precision highp float;

struct Light {
  vec3 color;
  vec3 position;
  float range;
};

uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

uniform sampler2D uTextureColor;
uniform sampler2D uTextureNormal;

#if LIGHTS > 0
uniform Light lights[LIGHTS];
#endif
uniform vec3 ambient;
uniform float normalScale;
 
varying vec2 vTextureCoord;
varying vec3 vPosition;

varying vec3 tangentVertexPosition;
varying vec3 tangentVertexNormal;
#if LIGHTS > 0
varying vec3 tangentLightPositions[LIGHTS];
#endif

varying vec3 tangentViewPosition;

vec3 computeLighting(vec3 viewDirection, vec3 texelNormal) {
  
  vec3 color = vec3(0.0,0.0,0.0);
  #if LIGHTS > 0
  for(int i = 0; i < LIGHTS; i++) {
    
    vec3 lightVec = tangentLightPositions[i].xyz - tangentVertexPosition.xyz;
    vec3 lightDirection = normalize(lightVec);
    
    float clip = max(dot(vec3(0.0,0.0,1.0), lightDirection), 0.0);
    float attenuation = clip * lights[i].range / pow(length(lightVec), 2.0);
    
    vec3 diffuse = vec3(max(dot(texelNormal, lightDirection), 0.0)) * attenuation;

    vec3 halfVec = normalize(lightDirection + viewDirection);
    vec3 specular = vec3(min(pow(max(dot(halfVec, texelNormal), 0.0), 32.0), 1.0)) * attenuation;
    
    color += (lights[i].color * diffuse) + vec3(specular);
  }
  #endif

    return color;
}

void main() { 

  vec3 viewDirection = normalize(tangentViewPosition.xyz - tangentVertexPosition.xyz);
  
  

  vec3 texelNormal = normalize(mix(vec3(0.0,0.0,1.0), texture2D(uTextureNormal, vTextureCoord).xyz * 2.0 - 1.0, normalScale));
  vec3 texelColor = texture2D(uTextureColor, vTextureCoord).xyz;
  
  vec3 lighting = computeLighting(viewDirection, texelNormal);
  vec3 L = texelColor * (lighting + ambient);
  gl_FragColor = vec4(L, 1.0);
}