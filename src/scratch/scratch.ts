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

/**
 * A custom Scratch Card component extending HTMLElement.
 * @class Scratch
 * @extends {HTMLElement}
 */
export class Scratch extends HTMLElement {
  /**
   * Observed attributes for the custom element.
   * @static
   * @returns {Array<ScratchAttributes>} An array of observed attribute names.
   */
  static get observedAttributes (): ScratchAttributes[] {
    return [ScratchAttributes.BRUSH_SIZE,
      ScratchAttributes.BRUSH_SHAPE,
      ScratchAttributes.SCRATCH_COLOR,
      ScratchAttributes.PERCENTAGE_UPDATE]
  }

  /**
   * Local reference of the component's canvas element.
   * @private {HTMLCanvasElement}
   */
  canvas: HTMLCanvasElement

  /**
   * Local reference of the component's content that should be hidden by the canvas.
   * @private {HTMLSlotElement}
   */
  slotRef: HTMLSlotElement

  /**
   * The 2D context of the component's canvas. Can be null when it is not yet initialized.
   * @private {CanvasRenderingContext2D|null}
   */
  context: CanvasRenderingContext2D | null

  /**
   * A Vector defining the x and y coordinates of the last input - used for drawing a line between these values and the new input values.
   * @private {Vector}
   */
  lastPosition: Vector

  /**
   * Flag that determines if a drawing process is currently happening.
   * @private {boolean}
   */
  isDrawing: boolean = false

  /**
   * Creates an instance of Scratch and initializes the local references as well as registers the mouse and touch event handlers.
   */
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

  /**
   * Lifecycle callback that gets invoked when the element is appended to the DOM. The slot shoudl be populated at this point.
   * Uses the slot's width and height vlaues to set the canvas' size to hide the slot. Also fills the canvas initially with the defined color.
   */
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

  /**
   * Lifecycle callback that gets invoked when the attribute of the element changes.
   * Reinitializes the canvas' context when ScratchAttributes.PERCENTAGE_UPDATE is toggled.
   * @param {string} name - Name of the attribute that changed.
   */
  attributeChangedCallback (name: string): void {
    if (name === ScratchAttributes.PERCENTAGE_UPDATE) this.context = this.canvas.getContext('2d', { willReadFrequently: this.percentageUpdate })
  }

  /**
   * Gets the value of the ScratchAttributes.BRUSH_SIZE attribute and parses it as a number.
   * @returns {number}
   */
  get brushSize (): number {
    return parseInt(this.getAttribute(ScratchAttributes.BRUSH_SIZE) ?? '10', 10)
  }

  /**
   * Gets the value of the ScratchAttributes.BRUSH_SHAPE attribute and parses it as a valid CanvasLineJoin.
   * @returns {CanvasLineJoin}
   */
  get brushShape (): CanvasLineJoin {
    let shape = this.getAttribute(ScratchAttributes.BRUSH_SHAPE) ?? 'round'
    if (shape !== 'bevel' && shape !== 'miter' && shape !== 'round') shape = 'round'
    return shape as CanvasLineJoin
  }

  /**
   * Gets the value of the ScratchAttributes.SCRATCH_COLOR attribute and parses it as a valid CSS color.
   * @returns {string}
   */
  get scratchColor (): string {
    let color = this.getAttribute(ScratchAttributes.SCRATCH_COLOR) ?? '#000000'
    if (!CSS.supports('color', color)) color = '#000000'
    return color
  }

  /**
   * Gets whether ScratchAttributes.PERCENTAGE_UPDATE is present on the element or not.
   * @returns {boolean}
   */
  get percentageUpdate (): boolean {
    return this.hasAttribute(ScratchAttributes.PERCENTAGE_UPDATE)
  }

  /**
   * Gets the offset of the canvas element from the top.
   * @private
   * @returns {number}
   */
  get offsetTop (): number {
    const { top } = this.canvas.getBoundingClientRect()
    return top + document.body.scrollTop
  }

  /**
   * Gets the offset of the canvas element from the left.
   * @private
   * @returns {number}
   */
  get offsetLeft (): number {
    const { left } = this.canvas.getBoundingClientRect()
    return left + document.body.scrollLeft
  }

  /**
   * Handles an event type agnostic input start event.
   * @param {Vector} { x, y } The x and y coordinates where the start event is triggered.
   * @returns {void}
   */
  handleStart ({ x, y }: Vector): void {
    this.lastPosition = { x: x - this.offsetLeft, y: y - this.offsetTop }
    this.scratch({ x: x - this.offsetLeft, y: y - this.offsetTop })
    this.isDrawing = true
    if (this.percentageUpdate) this.calcAreaCleared()
  }

  /**
   * Handles an event type agnostic input move event.
   * @param {Vector} { x, y } The x and y coordinates where the move event is triggered.
   * @returns {void}
   */
  handleMove ({ x, y }: Vector): void {
    if (!this.isDrawing) return
    this.scratch({ x: x - this.offsetLeft, y: y - this.offsetTop })
    if (this.percentageUpdate) this.calcAreaCleared()
  }

  /**
   * Handles an event type agnostic input end or cancelled event.
   * @returns {void}
   */
  handleEnd (): void {
    this.isDrawing = false
  }

  /**
   * Fills the canvas with the defined color.
   * @returns {void}
   */
  fillArea (): void {
    if (this.context === null) return
    const { width, height } = this.context.canvas
    this.context.globalCompositeOperation = 'source-over'
    this.context.fillStyle = this.scratchColor
    this.context.fillRect(0, 0, width, height)
    if (this.percentageUpdate) this.emitEvent(ScratchEvents.PERCENTAGE_UPDATE, 0)
  }

  /**
   * Clears the canvas.
   * @returns {void}
   */
  clearArea (): void {
    if (this.context === null) return
    const { width, height } = this.context.canvas
    this.context.globalCompositeOperation = 'destination-out'
    this.context.fillRect(0, 0, width, height)
    if (this.percentageUpdate) this.emitEvent(ScratchEvents.PERCENTAGE_UPDATE, 100)
  }

  /**
   * Clears the color off the canvas at the given coordinates.
   * @param {Vector} { x, y } The coordinates at which color should be cleared off.
   * @returns {void}
   */
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

  /**
   * Calculates the current amount of cleared pixels with an inaccuracy of 150 from the canvas' ImageData.
   * @returns {void}
   */
  calcAreaCleared (): void {
    if (this.context === null) return
    const { width, height } = this.context.canvas
    const { data } = this.context.getImageData(0, 0, width, height)
    /*
     * Data is an array that contains quadrupels of RGBA values -> for the cleared area calculation we are
     * only interestesd in the alpha channel (0 = transparent / 255 = fully visible) of this quadrupel.
     */
    const onlyAlphaChannel = this.getArrayWithValueOfQuadrupleAtNthIndex(data, 3)
    const chunkSize = 146
    const totalChunks = onlyAlphaChannel.length / chunkSize
    let clearedChunks = 0
    for (let i = clearedChunks; i < onlyAlphaChannel.length; i += chunkSize) {
      if (onlyAlphaChannel[i] === 0) clearedChunks += 1
    }
    const percentage = Math.round((clearedChunks / totalChunks) * 100)
    this.emitEvent(ScratchEvents.PERCENTAGE_UPDATE, percentage)
  }

  /**
   * Takes an Uint8ClampedArray and a number -> returns a new array that consists of every nth entry
   * in the given array.
   * @param {Uint8ClampedArray} source The source Uint8ClampedArray
   * @param {number} n The nth index as its a quadruple only numbers 0, 1, 2 and 3 are allowed
   */
  getArrayWithValueOfQuadrupleAtNthIndex (source: Uint8ClampedArray | number[], n: number): number[] {
    const arr = []
    for (let i = n; i < source.length; i = i + 4) {
      arr.push(source[i])
    }
    return arr
  }

  /**
   * Emits given event with given payload.
   * @param {ScratchEvents} eventType The name of the event that should be emitted.
   * @param {number} payload The payload for the emitted event.
   */
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
