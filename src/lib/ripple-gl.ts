// Ported from alibi-proto's Ripple.metal: a wave travelling out from the origin pushes each point
// along the line from it and brightens it on the crest
export const RIPPLE = {
  amplitude: 6,
  frequency: 22,
  decay: 9,
  /** How much the crest brightens what it passes over */
  light: 0.2
}

const VERTEX = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  // DOM space: y grows downward, matching the texture's first row (the image's top)
  v_uv.y = 1.0 - v_uv.y;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

const FRAGMENT = `
precision highp float;
uniform sampler2D u_texture;
uniform vec2 u_size;
uniform vec2 u_coverSize;
uniform vec2 u_coverOffset;
uniform vec2 u_origin;
uniform float u_time;
uniform float u_speed;
uniform float u_amplitude;
uniform float u_frequency;
uniform float u_decay;
uniform float u_light;
varying vec2 v_uv;
void main() {
  vec2 position = v_uv * u_size;
  vec2 away = position - u_origin;
  float distance = length(away);
  float t = max(0.0, u_time - distance / u_speed);
  float push = u_amplitude * sin(u_frequency * t) * exp(-u_decay * t);
  vec2 direction = distance > 0.0 ? away / distance : vec2(0.0);
  // object-fit: cover — the image is drawn at u_coverSize, centred, and cropped to the element
  vec4 color = texture2D(u_texture, (position + push * direction + u_coverOffset) / u_coverSize);
  color.rgb += u_light * push / u_amplitude * color.a;
  gl_FragColor = color;
}`

export type RippleFrame = {
  origin: [number, number]
  /** Seconds since the wave left the origin */
  time: number
  /** CSS px per second */
  speed: number
}

export type RippleRenderer = ReturnType<typeof createRenderer>

let renderer: RippleRenderer | null | undefined

// One context shared by every card: only one card is held at a time, and browsers cap live contexts
export function getRippleRenderer(): RippleRenderer | null {
  if (renderer === undefined) renderer = createRenderer()
  return renderer
}

function createRenderer() {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false })
  if (!gl) return null

  const program = gl.createProgram()!
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX))
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT))
  gl.linkProgram(program)
  gl.useProgram(program)

  // Full-screen quad as a two-triangle strip
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const position = gl.getAttribLocation(program, 'a_position')
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
  // Snapshots are not power-of-two sized, which WebGL 1 only samples with clamping and no mipmaps
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

  const uniform = (name: string) => gl.getUniformLocation(program, name)
  gl.uniform1f(uniform('u_amplitude'), RIPPLE.amplitude)
  gl.uniform1f(uniform('u_frequency'), RIPPLE.frequency)
  gl.uniform1f(uniform('u_decay'), RIPPLE.decay)
  gl.uniform1f(uniform('u_light'), RIPPLE.light)
  const size = uniform('u_size')
  const coverSize = uniform('u_coverSize')
  const coverOffset = uniform('u_coverOffset')
  const origin = uniform('u_origin')
  const time = uniform('u_time')
  const speed = uniform('u_speed')
  let releaseOwner: (() => void) | null = null

  return {
    canvas,
    /** A card pressed while another is still releasing takes the canvas; the other gets its <img> back */
    claim(release: () => void) {
      releaseOwner?.()
      releaseOwner = release
    },
    /** Takes over an object-cover <img>: same box, same crop, drawn at device resolution */
    setSource(image: HTMLImageElement) {
      const width = image.offsetWidth
      const height = image.offsetHeight
      const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight)
      const drawn = [image.naturalWidth * scale, image.naturalHeight * scale]

      canvas.width = Math.round(width * window.devicePixelRatio)
      canvas.height = Math.round(height * window.devicePixelRatio)
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
      gl.uniform2f(size, width, height)
      gl.uniform2f(coverSize, drawn[0], drawn[1])
      gl.uniform2f(coverOffset, (drawn[0] - width) / 2, (drawn[1] - height) / 2)
    },
    draw(frame: RippleFrame) {
      gl.uniform2f(origin, ...frame.origin)
      gl.uniform1f(time, frame.time)
      gl.uniform1f(speed, frame.speed)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
  }
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(shader) ?? 'shader')
  return shader
}
