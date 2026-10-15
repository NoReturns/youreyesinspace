#include <logdepthbuf_pars_fragment>

uniform float uTime;
uniform vec3 uColor;
uniform float uIntensity;
uniform float uCoreRadius; // fraction of quad half-size occupied by the star disc
uniform vec3 uDrift;
uniform float uMotionStrength;
uniform float uColorWarmth;

varying vec2 vUv;

void main() {
  #include <logdepthbuf_fragment>

  vec2 c = vUv * 2.0 - 1.0;
  float r = length(c);
  if (r > 1.0) discard;
  float ang = atan(c.y, c.x);
  float rr = max(r - uCoreRadius, 0.0) / max(1.0 - uCoreRadius, 1e-3);

#ifndef WOH_G64_DUST
  // Streamers
  vec3 drift = uDrift * uMotionStrength;
  float streaks = fbm(vec3(ang * 3.0, r * 6.0 - uTime * 0.03 + drift.x * 0.25, 1.0 + drift.y * 0.15), 4) * 0.5 + 0.5;
  float streaks2 = fbm(vec3(ang * 9.0 + 3.0, r * 14.0 - uTime * 0.02 + drift.z * 0.2, 7.0 + drift.x * 0.1), 3) * 0.5 + 0.5;

  // Inner corona: tight bright ring; outer: faint streamers
  float glow = exp(-rr * 16.0) * 0.9 + exp(-rr * 7.0) * 0.05;
  glow *= 0.6 + 0.6 * streaks + 0.3 * streaks2;
  glow += exp(-rr * 2.5) * 0.002 * (0.5 + streaks);
  glow *= 1.0 - smoothstep(0.7, 1.0, r);
  // slightly warmer toward the outside
  vec3 tint = mix(vec3(1.0), vec3(1.0, 0.8, 0.55), smoothstep(0.0, 0.6, rr));
#else
  // A faint, uneven dusty envelope on the existing billboard. It adds light only.
  float asymmetry = 0.62 + 0.24 * cos(ang - 0.7) + 0.11 * cos(ang * 2.0 + 1.2)
    + 0.08 * snoise(vec3(c * 3.2, 4.1));
  float glow = exp(-rr * 12.0) * 0.65 + exp(-rr * 4.0) * 0.10 * asymmetry;
  glow *= 1.0 - smoothstep(0.72, 1.0, r);
  vec3 tint = mix(vec3(1.0, 0.73, 0.50), vec3(0.65, 0.42, 0.28), smoothstep(0.05, 0.65, rr));
#endif

  vec3 col = uColor * tint * glow * uIntensity
    * vec3(1.0, 1.0 - 0.6 * uColorWarmth, 1.0 - 0.7 * uColorWarmth);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
