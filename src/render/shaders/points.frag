#include <logdepthbuf_pars_fragment>
uniform float uSoftness; // 0 = hard star, 1 = soft glow
uniform vec4 uTint;      // rgb + strength: "procedural content" highlight (0 = off, default)
varying vec3 vColor;
varying float vAlpha;
#ifdef STAR_POINTS
varying float vStarSize;
#endif
#if defined(QUADRATIC_STAR_POINTS) || defined(ADAPTIVE_CLOUD_POINTS)
float quadWeight(float x) {
  x = abs(x);
  return x < 0.5 ? 0.75 - x * x : 0.5 * pow(max(1.5 - x, 0.0), 2.0);
}
#endif
float pointProfile(float r) {
  float core = exp(-r * r * 8.0);
  float halo = exp(-r * 3.0) * 0.5;
  return mix(core + halo * 0.4, core * 0.6 + halo, uSoftness);
}
void main() {
  #include <logdepthbuf_fragment>
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r = length(c);
  float a;
#ifdef STAR_POINTS
  if (vStarSize >= 3.0 && r > 1.0) discard;
  // Integrate the old profile over its square sprite. Below a few physical
  // pixels, distribute its energy with a compact reconstruction kernel.
  // The weights sum to one at every subpixel position before output mapping.
  if (vStarSize < 5.0) {
#ifdef QUADRATIC_STAR_POINTS
    vec2 pixel = (gl_PointCoord - 0.5) * max(vStarSize, 3.0);
    vec2 coverage = vec2(quadWeight(pixel.x), quadWeight(pixel.y));
    float gain = 1.0 + 0.6 * (1.0 - smoothstep(0.5, 2.0, vStarSize));
#elif defined(ADAPTIVE_CLOUD_POINTS)
    vec2 pixel = (gl_PointCoord - 0.5) * (vStarSize < 1.0 ? 3.0 : max(vStarSize, 2.0));
    vec2 coverage = vStarSize < 1.0 ? vec2(quadWeight(pixel.x), quadWeight(pixel.y))
      : max(vec2(1.0) - abs(pixel), vec2(0.0));
    float gain = vStarSize < 1.0 ? 1.2 : 1.0;
#else
    vec2 pixel = (gl_PointCoord - 0.5) * max(vStarSize, 2.0);
    vec2 coverage = max(vec2(1.0) - abs(pixel), vec2(0.0));
    float gain = 1.0;
#endif
    float stable = gain * mix(0.1261, 0.1288, uSoftness) * vStarSize * vStarSize * coverage.x * coverage.y;
    a = vStarSize <= 3.0 ? stable : mix(stable, pointProfile(r), smoothstep(3.0, 5.0, vStarSize));
  } else {
    a = pointProfile(r);
  }
#else
  if (r > 1.0) discard;
  a = pointProfile(r);
#endif
  vec3 col = mix(vColor, uTint.rgb * max(vColor.r, max(vColor.g, vColor.b)), uTint.a);
  gl_FragColor = vec4(col * a * vAlpha, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
