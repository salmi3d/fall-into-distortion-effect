uniform float time;
uniform float progress;
uniform float mouseSpeed;
uniform vec2 mouse;
uniform sampler2D texture;
uniform vec4 resolution;

varying vec2 vUv;

void main() {
  float mouseDistance = length(vUv - mouse);
  float normalizedMouseSpeed = clamp(mouseSpeed * 40., 0., 1.);
  float c = smoothstep(0.2 * normalizedMouseSpeed, 0.0, mouseDistance);

  vec2 newUV = (vUv - vec2(0.5)) * resolution.zw + vec2(0.5);
  vec4 color = texture2D(texture, newUV);
  float r = texture2D(texture, newUV + 0.05 * c * normalizedMouseSpeed).r;
  float g = texture2D(texture, newUV + 0.03 * c * normalizedMouseSpeed).g;
  float b = texture2D(texture, newUV + 0.01 * c * normalizedMouseSpeed).b;

  // gl_FragColor = vec4(vUv, 0., 1.);
  // gl_FragColor = color;
  // gl_FragColor = vec4(normalizedMouseSpeed * mouseDistance, 0., 0., 1.);
  // gl_FragColor = vec4(c, 0., 0., 1.);
  gl_FragColor = vec4(r, g, b, 1.);
}
