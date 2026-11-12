/*
  The hero water. Everything is computed per pixel in device space, so there
  are no textures to download: moving caustics on a pale floor, light shafts
  that appear as the visitor dives, ripple rings, and a liquid drop that
  refracts whatever is beneath it.

  Uniform units: positions and radii are canvas pixels, origin bottom-left.
*/

export const VERTEX_SHADER = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_res;
uniform float u_time;
uniform float u_depth;    // 0 at the surface, 1 at the bottom of the dive
uniform float u_dark;     // eased 0..1 so a theme switch fades instead of cuts
uniform vec3 u_drop;      // x, y, radius — radius 0 hides the drop
uniform vec2 u_vel;       // drop velocity (px/s) for the squash-and-stretch
uniform vec2 u_calm;      // x (0..1) where the copy column ends, and how calm it is
uniform vec4 u_ripple[4]; // x, y, start time, strength
uniform float u_quality;  // 1 = two caustic layers, 0 = one

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

float hash1(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// Distance to the nearest seam between drifting Voronoi cells (F2 - F1).
// A wavy surface focuses sunlight along exactly these kinds of seams.
float seams(vec2 p, float t) {
  vec2 g = floor(p);
  vec2 f = fract(p);
  float d1 = 8.0;
  float d2 = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y));
      vec2 h = hash2(g + o);
      vec2 r = o + 0.5 + 0.4 * sin(t + 6.2831 * h) - f;
      float d = dot(r, r);
      if (d < d1) {
        d2 = d1;
        d1 = d;
      } else if (d < d2) {
        d2 = d;
      }
    }
  }
  return sqrt(d2) - sqrt(d1);
}

float caustics(vec2 p, float t) {
  // A slow sine warp bends the straight Voronoi edges into filaments.
  p += 0.32 * vec2(sin(p.y * 1.3 + t * 0.5), cos(p.x * 1.1 - t * 0.4));
  // A thin bright core plus a faint glow that fills the cell.
  float s1 = seams(p, t * 0.7);
  float a = smoothstep(0.075, 0.0, s1) + exp(-s1 * 7.0) * 0.22;
  float b = 0.0;
  if (u_quality > 0.5) {
    float s2 = seams(p * 1.6 + 7.3, t * 0.9);
    b = smoothstep(0.06, 0.0, s2) + exp(-s2 * 8.0) * 0.18;
  }
  // Where the two layers cross, the light concentrates.
  return a * 0.6 + b * 0.32 + a * b * 0.9;
}

float shafts(vec2 uv, float t) {
  float x = uv.x + (1.0 - uv.y) * 0.35;
  float s = smoothstep(0.62, 1.0, sin(x * 9.0 + t * 0.15) * 0.5 + 0.5);
  s += 0.7 * smoothstep(0.7, 1.0, sin(x * 15.0 - t * 0.11 + 1.3) * 0.5 + 0.5);
  s += 0.5 * smoothstep(0.76, 1.0, sin(x * 23.0 + t * 0.07 + 4.1) * 0.5 + 0.5);
  return s * uv.y * uv.y;
}

vec3 water(vec2 frag, float t) {
  vec2 uv = frag / u_res;
  float d = u_depth;

  // Day: brand-50 -> brand-200 at the surface, brand-800 -> abyss at depth.
  vec3 surfaceDay = mix(vec3(0.722, 0.906, 1.0), vec3(0.937, 0.976, 1.0), uv.y);
  vec3 deepDay = mix(vec3(0.016, 0.102, 0.169), vec3(0.020, 0.341, 0.537), uv.y * 0.85);
  // Night: brand-950 under a near-black sky, sinking to black-blue.
  vec3 surfaceNight = mix(vec3(0.027, 0.180, 0.294), vec3(0.047, 0.098, 0.141), uv.y);
  vec3 deepNight = mix(vec3(0.008, 0.035, 0.063), vec3(0.027, 0.150, 0.250), uv.y * 0.7);

  float sink = smoothstep(0.0, 1.0, d);
  vec3 col = mix(mix(surfaceDay, deepDay, sink), mix(surfaceNight, deepNight, sink), u_dark);

  float edge = u_calm.x;
  float calm = mix(1.0 - u_calm.y, 1.0, smoothstep(edge - 0.12, edge + 0.1, uv.x));
  float strength = (1.0 - d) * (1.0 - d) * calm;
  vec3 light = mix(vec3(1.0), vec3(0.47, 0.83, 1.0), u_dark);
  // Cell size from the screen's area and long side, so a tall phone isn't
  // covered in fine mesh.
  float scale = 1.0 / max(sqrt(u_res.x * u_res.y) * 0.12, max(u_res.x, u_res.y) * 0.1);
  col += light * caustics(frag * scale, t) * strength * mix(0.6, 0.3, u_dark);

  float shaftAmount = smoothstep(0.05, 0.45, d) * (1.0 - 0.5 * smoothstep(0.8, 1.0, d));
  col += vec3(0.6, 0.85, 1.0) * shafts(uv, t) * shaftAmount * mix(0.2, 0.14, u_dark);

  // Suspended motes catch the light once below the surface.
  vec2 mp = frag / (min(u_res.x, u_res.y) * 0.06) + vec2(0.0, t * 0.25);
  vec2 mc = floor(mp);
  vec2 mo = hash2(mc);
  float mote = smoothstep(0.08, 0.0, length(fract(mp) - mo)) * step(0.82, hash1(mc));
  col += vec3(0.7, 0.9, 1.0) * mote * shaftAmount * 0.35;

  return col;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  float t = u_time;
  float unit = min(u_res.x, u_res.y);

  vec2 disp = vec2(0.0);
  float glint = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 r = u_ripple[i];
    float age = t - r.z;
    if (r.w > 0.0 && age > 0.0 && age < 3.0) {
      vec2 dv = frag - r.xy;
      float dist = length(dv);
      float radius = age * 0.42 * unit;
      float width = 0.035 * unit;
      float ring = exp(-pow((dist - radius) / width, 2.0)) * exp(-age * 1.4) * r.w;
      disp += (dv / max(dist, 1.0)) * ring * 14.0;
      glint += ring;
    }
  }

  vec3 col = water(frag + disp, t);

  if (u_drop.z > 0.5) {
    vec2 dc = frag - u_drop.xy;
    float speed = length(u_vel);
    vec2 dir = speed > 1.0 ? u_vel / speed : vec2(1.0, 0.0);
    float stretch = 1.0 + min(speed / 2600.0, 0.16);
    vec2 q = vec2(dot(dc, dir) / stretch, dot(dc, vec2(-dir.y, dir.x)) * sqrt(stretch));
    float ang = atan(dc.y, dc.x);
    float radius = u_drop.z * (1.0 + 0.028 * sin(3.0 * ang + t * 1.6) + 0.018 * sin(5.0 * ang - t * 1.1));
    float dd = length(q) / radius;

    // Shadow and the bright spot where the drop focuses light, both offset
    // away from a light source at the upper left.
    vec2 so = (dc - vec2(0.16, -0.34) * radius) / vec2(1.05, 0.8);
    float shadow = smoothstep(1.25, 0.55, length(so) / radius) * 0.16 * (1.0 - u_depth * 0.5);
    float focus = smoothstep(0.5, 0.0, length(dc - vec2(0.28, -0.52) * radius) / radius);
    vec3 floorCol = col * (1.0 - shadow) + focus * 0.22 * (1.0 - u_depth);

    if (dd < 1.0) {
      vec3 n = normalize(vec3(q / radius, sqrt(max(1.0 - dd * dd, 0.0))));
      vec3 rd = refract(vec3(0.0, 0.0, -1.0), n, 0.75);
      vec3 inside = water(frag + disp + rd.xy * radius * 0.9, t);
      inside = mix(inside, inside * vec3(0.86, 0.95, 1.04) + vec3(0.02, 0.05, 0.08), 0.35);
      float fres = pow(1.0 - n.z, 2.5);
      inside += mix(vec3(1.0), vec3(0.6, 0.85, 1.0), u_dark) * fres * 0.32;
      // Total internal reflection darkens a thin band at the edge; it's what
      // makes a drop on a surface read as a drop rather than a disc.
      inside *= 1.0 - mix(0.2, 0.32, u_dark) * smoothstep(0.86, 0.99, dd);
      vec3 key = normalize(vec3(-0.45, 0.6, 0.65));
      float spec = max(dot(reflect(-key, n), vec3(0.0, 0.0, 1.0)), 0.0);
      inside += pow(spec, 90.0) * 1.1 + pow(spec, 14.0) * 0.12;
      inside += pow(max(dot(n, normalize(vec3(0.5, -0.55, 0.65))), 0.0), 12.0) * 0.1;
      col = mix(floorCol, inside, smoothstep(1.0, 0.975, dd));
    } else {
      col = floorCol;
    }
  }

  col += glint * 0.08 * mix(vec3(1.0), vec3(0.5, 0.8, 1.0), u_dark);
  // Sub-LSB noise so the long gradients don't band.
  col += (hash1(frag + fract(t) * 91.7) - 0.5) * 0.012;
  gl_FragColor = vec4(col, 1.0);
}
`;
