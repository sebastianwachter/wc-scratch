import styles from './style.css?raw'

const template = document.createElement('template')
template.innerHTML = `<style>${styles}</style><div><slot></slot><canvas></canvas></div>`

enum ScratchAttributes {
  BRUSH_SIZE = 'brush-size',
  BRUSH_SHAPE = 'brush-shape',
  SCRATCH_COLOR = 'scratch-color',
  PERCENTAGE_UPDATE = 'percentage-update'
}

export enum ScratchEvents {
  PERCENTAGE_UPDATE = 'percentage-update'
}

export interface Vector {
  x: number
  y: number
}

export class Scratch extends HTMLElement {
  static get observedAttributes (): ScratchAttributes[] {
    return [ScratchAttributes.BRUSH_SIZE,
      ScratchAttributes.BRUSH_SHAPE,
      ScratchAttributes.SCRATCH_COLOR,
      ScratchAttributes.PERCENTAGE_UPDATE]
  }

  canvas: HTMLCanvasElement

  slotRef: HTMLSlotElement

  context: CanvasRenderingContext2D | null

  lastPosition: Vector

  isDrawing: boolean = false

  constructor () {
    super()

    this.attachShadow({ mode: 'open' })
    this.shadowRoot?.appendChild(template.content.cloneNode(true))

    this.canvas = this.shadowRoot?.querySelector('canvas') ?? new HTMLCanvasElement()
    this.slotRef = this.shadowRoot?.querySelector('slot') ?? new HTMLSlotElement()
    this.context = this.canvas.getContext('2d')
    this.lastPosition = { x: 0, y: 0 }

    this.canvas.addEventListener('mousedown', ({ clientX, clientY }: MouseEvent) => this.handleStart({ x: clientX, y: clientY }), false)
    window.addEventListener('mousemove', ({ clientX, clientY }: MouseEvent) => this.handleMove({ x: clientX, y: clientY }), false)
    window.addEventListener('mouseup', () => this.handleEnd(), false)
    this.canvas.addEventListener('touchstart', ({ targetTouches: [{ clientX, clientY }] }: TouchEvent) => this.handleStart({ x: clientX, y: clientY }), false)
    window.addEventListener('touchmove', (e: TouchEvent) => {
      if (this.isDrawing) e.preventDefault()
      const { targetTouches: [{ clientX, clientY }] } = e
      this.handleMove({ x: clientX, y: clientY })
    }, { passive: false })
    window.addEventListener('touchcancel', () => this.handleEnd(), false)
    window.addEventListener('touchend', () => this.handleEnd(), false)
  }

  connectedCallback (): void {
    const slotChildNodeBoundingClientRect = this.slotRef.assignedElements()[0].getBoundingClientRect()
    const newWidth = Math.floor(slotChildNodeBoundingClientRect.width)
    const newHeight = Math.floor(slotChildNodeBoundingClientRect.height)
    this.canvas.style.width = `${newWidth}px`
    this.canvas.width = newWidth
    this.canvas.style.height = `${newHeight}px`
    this.canvas.height = newHeight
    this.context = this.canvas.getContext('2d', { willReadFrequently: this.percentageUpdate })
    this.fillArea()
  }

  attributeChangedCallback (name: string): void {
    if (name === ScratchAttributes.PERCENTAGE_UPDATE) this.context = this.canvas.getContext('2d', { willReadFrequently: this.percentageUpdate })
  }

  get brushSize (): number {
    return parseInt(this.getAttribute(ScratchAttributes.BRUSH_SIZE) ?? '10', 10)
  }

  get brushShape (): CanvasLineJoin {
    let shape = this.getAttribute(ScratchAttributes.BRUSH_SHAPE) ?? 'round'
    if (shape !== 'bevel' && shape !== 'miter' && shape !== 'round') shape = 'round'
    return shape as CanvasLineJoin
  }

  get scratchColor (): string {
    let color = this.getAttribute(ScratchAttributes.SCRATCH_COLOR) ?? '#000000'
    if (!CSS.supports('color', color)) color = '#000000'
    return color
  }

  get percentageUpdate (): boolean {
    return this.hasAttribute(ScratchAttributes.PERCENTAGE_UPDATE)
  }

  get offsetTop (): number {
    const { top } = this.canvas.getBoundingClientRect()
    return top + document.body.scrollTop
  }

  get offsetLeft (): number {
    const { left } = this.canvas.getBoundingClientRect()
    return left + document.body.scrollLeft
  }

  handleStart ({ x, y }: Vector): void {
    this.lastPosition = { x: x - this.offsetLeft, y: y - this.offsetTop }
    this.scratch({ x: x - this.offsetLeft, y: y - this.offsetTop })
    this.isDrawing = true
    if (this.percentageUpdate) this.calcAreaCleared()
  }

  handleMove ({ x, y }: Vector): void {
    if (!this.isDrawing) return
    this.scratch({ x: x - this.offsetLeft, y: y - this.offsetTop })
    if (this.percentageUpdate) this.calcAreaCleared()
  }

  handleEnd (): void {
    this.isDrawing = false
  }

  fillArea (): void {
    if (this.context === null) return
    const { width, height } = this.context.canvas
    this.context.globalCompositeOperation = 'source-over'
    this.context.fillStyle = this.scratchColor
    this.context.fillRect(0, 0, width, height)
    if (this.percentageUpdate) this.emitEvent(ScratchEvents.PERCENTAGE_UPDATE, 0)
  }

  clearArea (): void {
    if (this.context === null) return
    const { width, height } = this.context.canvas
    this.context.globalCompositeOperation = 'destination-out'
    this.context.fillRect(0, 0, width, height)
    if (this.percentageUpdate) this.emitEvent(ScratchEvents.PERCENTAGE_UPDATE, 100)
  }

  scratch ({ x, y }: Vector): void {
    if (this.context === null) return
    this.context.beginPath()
    this.context.globalCompositeOperation = 'destination-out'
    this.context.lineWidth = this.brushSize
    this.context.lineJoin = this.brushShape
    this.context.moveTo(this.lastPosition.x, this.lastPosition.y)
    if (this.isDrawing) this.context.lineTo(x, y)
    else this.context.lineTo(x + 0.1, y + 0.1)
    this.context.closePath()
    this.context.stroke()
    this.lastPosition = { x, y }
  }

  calcAreaCleared (): void {
    if (this.context === null) return
    const { width, height } = this.context.canvas
    const { data, data: { length } } = this.context.getImageData(0, 0, width, height)
    const chunkSize = 150
    const totalChunks = length / chunkSize
    let clearedChunks = 0
    for (let i = clearedChunks; i < length; i += chunkSize) {
      if (Math.ceil(data[i]) === 0) clearedChunks += 1
    }
    const percentage = Math.round((clearedChunks / totalChunks) * 100)
    this.emitEvent(ScratchEvents.PERCENTAGE_UPDATE, percentage)
  }

  emitEvent (eventType: ScratchEvents, payload: number): void {
    const event = new CustomEvent(eventType, { detail: payload })
    this.dispatchEvent(event)
  }
}

customElements.define('wc-scratch', Scratch)

declare global {
  interface HTMLElementTagNameMap {
    'wc-scratch': Scratch
  }
}

declare global {
  interface HTMLElementEventMap {
    'percentage-update': CustomEvent<{ detail: number }>
  }
}
