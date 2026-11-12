/*
  Just enough WebGL to draw one full-screen fragment shader: compile, link,
  a single oversized triangle, and uniform lookup. WebGL1 so the widest set of
  phones gets the GPU scene rather than the CSS fallback.
*/

/** `KHR_parallel_shader_compile` lets us poll instead of blocking on link. */
const COMPLETION_STATUS_KHR = 0x91b1;

export interface Program {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  uniform: (name: string) => WebGLUniformLocation | null;
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("createShader failed");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

/**
 * Compiles and links without stalling the main thread where the driver allows
 * it. Resolves once the program is usable; rejects with the info log if not.
 */
export function createProgram(
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string,
): Promise<Program> {
  const vs = compile(gl, gl.VERTEX_SHADER, vertexSource);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) return Promise.reject(new Error("createProgram failed"));
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  const parallel = gl.getExtension("KHR_parallel_shader_compile");

  const finish = (): Program => {
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log =
        gl.getShaderInfoLog(fs) || gl.getShaderInfoLog(vs) || gl.getProgramInfoLog(program);
      throw new Error(`shader link failed: ${log ?? "unknown"}`);
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    const cache = new Map<string, WebGLUniformLocation | null>();
    return {
      gl,
      program,
      uniform: (name) => {
        if (!cache.has(name)) cache.set(name, gl.getUniformLocation(program, name));
        return cache.get(name) ?? null;
      },
    };
  };

  if (!parallel) return Promise.resolve().then(finish);

  return new Promise((resolve, reject) => {
    const poll = () => {
      if (gl.isContextLost()) {
        reject(new Error("context lost during compile"));
      } else if (gl.getProgramParameter(program, COMPLETION_STATUS_KHR)) {
        try {
          resolve(finish());
        } catch (error) {
          reject(error);
        }
      } else {
        requestAnimationFrame(poll);
      }
    };
    poll();
  });
}

/** One triangle that over-covers clip space; cheaper than a two-triangle quad. */
export function bindFullScreenTriangle(gl: WebGLRenderingContext, program: WebGLProgram) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const location = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
}
