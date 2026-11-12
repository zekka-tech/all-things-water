import { bindFullScreenTriangle, createProgram, type Program } from "./gl";
import { depthFor } from "./depth";
import { FRAGMENT_SHADER, VERTEX_SHADER } from "./shaders";

export type FallbackReason = "no-webgl" | "software" | "compile" | "context-lost" | "slow";

export interface WaterSceneOptions {
  dark: boolean;
  /** Freeze time: render on demand only, no pointer lens. */
  still: boolean;
  /** QA only: run on software rasterisers and skip the frame-time check
   *  that hands over to the CSS fallback. */
  forceGl?: boolean;
  onReady: () => void;
  onFallback: (reason: FallbackReason) => void;
}

export interface WaterScene {
  /** Scroll position through the dive, 0..1. */
  setProgress: (progress: number) => void;
  setDark: (dark: boolean) => void;
  /** Pointer position in CSS px relative to the viewport. */
  setPointer: (clientX: number, clientY: number) => void;
  ripple: (clientX: number, clientY: number, strength?: number) => void;
  setVisible: (visible: boolean) => void;
  destroy: () => void;
}

const RIPPLES = 4;
/** Frames above this budget count as slow (≈ 30 fps). */
const SLOW_FRAME_MS = 34;
/** How long frames may run over budget before quality steps down. */
const SLOW_BUDGET_MS = 1200;
/** Shader warm-up frames are often slow on any device; skip them. */
const WARMUP_FRAMES = 4;
const MIN_SCALE = 0.5;

interface Layout {
  /** Drop rest position as a fraction of the canvas (y measured from the top). */
  rest: [number, number];
  radius: number;
  calm: [number, number];
}

/** Renderer names of CPU rasterisers: SwiftShader (headless Chrome, GPU-less
 *  VMs), Mesa's llvmpipe/softpipe, and Windows' basic display driver. */
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render/i;

const isSoftware = (gl: WebGLRenderingContext) => {
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const name = gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
  return typeof name === "string" && SOFTWARE_RENDERER.test(name);
};

const layoutFor = (width: number, height: number): Layout =>
  width >= 1024
    ? { rest: [0.74, 0.44], radius: Math.min(width, height) * 0.17, calm: [0.5, 0.8] }
    : { rest: [0.74, 0.85], radius: Math.min(width, height) * 0.2, calm: [1.2, 0.7] };

export async function createWaterScene(
  canvas: HTMLCanvasElement,
  options: WaterSceneOptions,
): Promise<WaterScene | null> {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: "low-power",
    // A CPU rasteriser can't run this shader at frame rate and stalls the
    // main thread compiling it; the CSS water is the better page there.
    failIfMajorPerformanceCaveat: !options.forceGl,
  });
  if (!gl) {
    options.onFallback("no-webgl");
    return null;
  }
  // Not every browser honours the caveat flag, so check the renderer too.
  if (!options.forceGl && isSoftware(gl)) {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    options.onFallback("software");
    return null;
  }
  // Narrowed once for the hoisted helpers below.
  const context: WebGLRenderingContext = gl;

  let program: Program;
  try {
    program = await createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
  } catch (error) {
    if (import.meta.env.DEV) console.warn("[water]", error);
    options.onFallback(gl.isContextLost() ? "context-lost" : "compile");
    return null;
  }
  gl.useProgram(program.program);
  bindFullScreenTriangle(gl, program.program);

  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const started = performance.now();
  const stillTime = 14;

  let dead = false;
  let visible = true;
  let raf = 0;
  let scale = 1;
  let progress = 0;
  let dark = options.dark ? 1 : 0;
  let darkTarget = dark;
  let layout = layoutFor(1, 1);
  let width = 1;
  let height = 1;
  const drop = { x: 0, y: 0, vx: 0, vy: 0 };
  let target: [number, number] | null = null;
  let lastFrame = 0;
  let frames = 0;
  let slowMs = 0;
  let splashed = false;
  let readyFired = false;
  const ripples = new Float32Array(RIPPLES * 4);
  let rippleIndex = 0;

  const now = () => (options.still ? stillTime : (performance.now() - started) / 1000);

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1 : 1.5) * scale;
    // Cap the fill on very large screens; this shader is fill-rate bound.
    const budget = Math.sqrt(2_200_000 / Math.max(rect.width * rect.height * dpr * dpr, 1));
    const ratio = dpr * Math.min(1, budget);
    width = Math.max(1, Math.round(rect.width * ratio));
    height = Math.max(1, Math.round(rect.height * ratio));
    const changed = canvas.width !== width || canvas.height !== height;
    if (changed) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    layout = layoutFor(rect.width, rect.height);
    layout.radius *= ratio;
    if (!target) {
      drop.x = width * layout.rest[0];
      drop.y = height * (1 - layout.rest[1]);
    }
    // Resizing clears the drawing buffer; repaint now, or the next composite
    // shows a black frame.
    if (changed && !dead) draw(now(), 0);
  };

  const toCanvas = (clientX: number, clientY: number): [number, number] => {
    const rect = canvas.getBoundingClientRect();
    return [
      ((clientX - rect.left) / Math.max(rect.width, 1)) * width,
      (1 - (clientY - rect.top) / Math.max(rect.height, 1)) * height,
    ];
  };

  const draw = (time: number, dt: number) => {
    dark += (darkTarget - dark) * Math.min(1, dt * 4);

    // The drop rests on the right, follows the mouse without entering the
    // copy column, drifts by itself on touch, and sinks as the dive begins.
    let [tx, ty] = [width * layout.rest[0], height * (1 - layout.rest[1])];
    if (target && !options.still) {
      tx = Math.max(target[0], width * layout.calm[0] + layout.radius * 0.9);
      ty = target[1];
    } else if (coarse && !options.still) {
      tx += Math.sin(time * 0.3) * width * 0.04;
      ty += Math.cos(time * 0.23) * height * 0.03;
    }
    const sink = Math.min(progress / 0.16, 1);
    ty -= sink * height * 0.35;
    const k = options.still ? 1 : Math.min(1, dt * 6);
    const nx = drop.x + (tx - drop.x) * k;
    const ny = drop.y + (ty - drop.y) * k;
    if (dt > 0) {
      drop.vx += ((nx - drop.x) / dt - drop.vx) * 0.2;
      drop.vy += ((ny - drop.y) / dt - drop.vy) * 0.2;
    }
    drop.x = nx;
    drop.y = ny;
    const radius = layout.radius * (1 - sink);

    if (sink >= 1 && !splashed && !options.still) {
      splashed = true;
      addRipple(drop.x, drop.y + layout.radius * 0.3, 1.2, time);
    } else if (sink < 0.5) {
      splashed = false;
    }

    gl.uniform2f(program.uniform("u_res"), width, height);
    gl.uniform1f(program.uniform("u_time"), time);
    gl.uniform1f(program.uniform("u_depth"), depthFor(progress));
    gl.uniform1f(program.uniform("u_dark"), dark);
    gl.uniform3f(program.uniform("u_drop"), drop.x, drop.y, radius);
    gl.uniform2f(program.uniform("u_vel"), drop.vx, drop.vy);
    gl.uniform2f(program.uniform("u_calm"), layout.calm[0], layout.calm[1]);
    gl.uniform4fv(program.uniform("u_ripple"), ripples);
    gl.uniform1f(program.uniform("u_quality"), scale > 0.75 ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (!readyFired) {
      readyFired = true;
      options.onReady();
    }
  };

  function addRipple(x: number, y: number, strength: number, time: number) {
    const i = rippleIndex++ % RIPPLES;
    ripples.set([x, y, time, strength], i * 4);
  }

  const tick = (stamp: number) => {
    raf = 0;
    if (dead || !visible) return;
    const dt = lastFrame ? Math.min((stamp - lastFrame) / 1000, 0.1) : 1 / 60;
    const frameMs = lastFrame ? stamp - lastFrame : 0;
    lastFrame = stamp;
    draw(now(), dt);

    // Adaptive quality: after a short warm-up, time spent in slow frames
    // accumulates (fast frames pay it back); a sustained budget overrun first
    // shrinks the resolution, then hands over to the CSS layer. Measuring in
    // time rather than frames means a device managing one frame a second
    // gives up in seconds, not minutes. Gaps after the scene was hidden
    // don't count: setVisible resets lastFrame.
    frames++;
    if (frames > WARMUP_FRAMES && frameMs > 0) {
      slowMs = frameMs > SLOW_FRAME_MS ? slowMs + frameMs : Math.max(0, slowMs - frameMs);
      if (slowMs > SLOW_BUDGET_MS) {
        slowMs = 0;
        if (scale > MIN_SCALE) {
          scale = Math.max(MIN_SCALE, scale * 0.7);
          resize();
        } else if (!options.forceGl) {
          options.onFallback("slow");
          destroy();
          return;
        }
      }
    }
    schedule();
  };

  const schedule = () => {
    if (!raf && !dead && visible && !options.still) raf = requestAnimationFrame(tick);
  };

  /** Still mode renders exactly when something changes. */
  const redraw = () => {
    if (options.still && !dead && visible && !raf) {
      raf = requestAnimationFrame(() => {
        raf = 0;
        draw(stillTime, 1);
      });
    }
  };

  const onLost = (event: Event) => {
    event.preventDefault();
    options.onFallback("context-lost");
    destroy();
  };
  canvas.addEventListener("webglcontextlost", onLost);

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  function destroy() {
    if (dead) return;
    dead = true;
    cancelAnimationFrame(raf);
    observer.disconnect();
    canvas.removeEventListener("webglcontextlost", onLost);
    context.getExtension("WEBGL_lose_context")?.loseContext();
  }

  resize();
  if (options.still) redraw();
  else schedule();

  return {
    setProgress: (value) => {
      progress = value;
      redraw();
    },
    setDark: (value) => {
      darkTarget = value ? 1 : 0;
      if (options.still) dark = darkTarget;
      redraw();
    },
    setPointer: (clientX, clientY) => {
      if (options.still || coarse) return;
      target = toCanvas(clientX, clientY);
    },
    ripple: (clientX, clientY, strength = 1) => {
      if (options.still) return;
      const [x, y] = toCanvas(clientX, clientY);
      addRipple(x, y, strength, now());
    },
    setVisible: (value) => {
      visible = value;
      if (value) {
        lastFrame = 0;
        schedule();
        redraw();
      }
    },
    destroy,
  };
}
