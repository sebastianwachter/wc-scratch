import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { Scratch, ScratchEvents } from '../src/scratch/scratch'

const CSSMock = {
  supports: vi.fn()
}

vi.stubGlobal('CSS', CSSMock)

describe('wc-scratch', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('is defined', async () => {
    // Arrange & Act
    document.body.innerHTML = '<wc-scratch><p>Scratch!</p></wc-scratch>'
    const comp = document.querySelector('wc-scratch')

    // Assert
    expect(comp).toBeDefined()
  })

  it.each([
    ['bevel', 'bevel'],
    ['miter', 'miter'],
    ['round', 'round'],
    ['any', 'round']
  ])('should set valid CanvasLineJoin: %s -> %s', async (input, expected) => {
    // Arrange & Act
    document.body.innerHTML = `<wc-scratch brush-shape=${input}><p>Scratch!</p></wc-scratch>`
    const comp = document.querySelector('wc-scratch') as Scratch

    // Assert
    expect(comp.brushShape).toEqual(expected)
  })

  it.each([false, true])('should scroll the view when touching', async (param) => {
    // Arrange
    document.body.innerHTML = '<wc-scratch><p>Scratch!</p></wc-scratch>'
    const comp = document.querySelector('wc-scratch') as Scratch
    if (comp.context === null) return
    comp.isDrawing = param

    const touch = { clientX: 1, clientY: 1 } as unknown as Touch
    const touchEvent = new TouchEvent('touchmove', {
      targetTouches: [touch]
    })

    const preventDefaultSpy = vi.spyOn(touchEvent, 'preventDefault')
    const handleMoveSpy = vi.spyOn(comp, 'handleMove')

    // Act
    window.dispatchEvent(touchEvent)

    // Assert
    expect(preventDefaultSpy).toHaveBeenCalledTimes(param ? 1 : 0)
    expect(handleMoveSpy).toHaveBeenCalledTimes(1)
  })

  it.each([Object.values(ScratchEvents)])('can emit event: %s', async (name) => {
    // Arrange
    document.body.innerHTML = '<wc-scratch><p>Scratch!</p></wc-scratch>'
    const comp = document.querySelector('wc-scratch') as Scratch
    let res = -1
    comp.addEventListener(name, (e: CustomEvent) => (res = e.detail))

    // Act
    comp?.emitEvent(name, 10)

    // Assert
    expect(res).toEqual(10)
  })

  it.each([false, true])('handles user event: start with percentage-update: %s', async (param) => {
    // Arrange
    document.body.innerHTML = param
      ? '<wc-scratch percentage-update><p>Scratch!</p></wc-scratch>'
      : '<wc-scratch><p>Scratch!</p></wc-scratch>'
    const comp = document.querySelector('wc-scratch') as Scratch
    if (comp.context === null) return

    const imageDataSpy = vi.spyOn(comp.context, 'getImageData')
    const imageData = { data: new Uint8ClampedArray(900).fill(255) } as unknown as ImageData
    imageDataSpy.mockImplementationOnce(() => (imageData))

    vi.spyOn(comp, 'scratch')
    const calcSpy = vi.spyOn(comp, 'calcAreaCleared')

    // Act
    comp.handleStart({ x: 5, y: 5 })

    // Assert
    expect(comp.lastPosition).toEqual({ x: 5, y: 5 })
    expect(comp.scratch).toBeCalledTimes(1)
    expect(comp.isDrawing).toEqual(true)
    expect(calcSpy).toBeCalledTimes(param ? 1 : 0)
  })

  it.each([false, true])('handles user event: move with percentage-update: %s', async (param) => {
    // Arrange
    document.body.innerHTML = param
      ? '<wc-scratch percentage-update><p>Scratch!</p></wc-scratch>'
      : '<wc-scratch><p>Scratch!</p></wc-scratch>'
    const comp = document.querySelector('wc-scratch') as Scratch
    if (comp.context === null) return

    const imageDataSpy = vi.spyOn(comp.context, 'getImageData')
    const imageData = { data: new Uint8ClampedArray(900).fill(255) } as unknown as ImageData
    imageDataSpy.mockImplementationOnce(() => (imageData))

    comp.isDrawing = true
    vi.spyOn(comp, 'scratch')
    const calcSpy = vi.spyOn(comp, 'calcAreaCleared')

    // Act
    comp.handleMove({ x: 5, y: 5 })

    // Assert
    expect(comp.lastPosition).toEqual({ x: 5, y: 5 })
    expect(comp.scratch).toBeCalledTimes(1)
    expect(calcSpy).toBeCalledTimes(param ? 1 : 0)
  })

  it('handles user event: end', async () => {
    // Arrange
    document.body.innerHTML = '<wc-scratch><p>Scratch!</p></wc-scratch>'
    const comp = document.querySelector('wc-scratch') as Scratch
    comp.isDrawing = true

    // Act
    comp.handleEnd()

    // Assert
    expect(comp.isDrawing).toEqual(false)
  })

  it.each([0, 1, 2, 3])('generates an array with values at nth: %s index of given array', async (nth) => {
    // Arrange
    document.body.innerHTML = '<wc-scratch><p>Scratch!</p></wc-scratch>'
    const comp = document.querySelector('wc-scratch')
    if (comp === null) return
    const sourceArray = [1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4]
    const quadrupleAmount = sourceArray.length / 4

    // Act
    const resultArray = comp.getArrayWithValueOfQuadrupleAtNthIndex(sourceArray, nth)

    // Assert
    expect(resultArray.length).toEqual(quadrupleAmount)
    expect(resultArray.filter(num => num === nth + 1).length).toEqual(quadrupleAmount)
  })

  it('calculates its cleared area', async () => {
    // Arrange
    document.body.innerHTML = `
      <wc-scratch percentage-update>
        <h1>Scratch!</h1>
      </wc-scratch>
    `
    const comp = document.querySelector('wc-scratch') as Scratch
    if (comp.context === null) return

    const imageDataSpy = vi.spyOn(comp.context, 'getImageData')
    const allFilledWithBlack = new Array(1200).fill(0)
    for (let i = 3; i < allFilledWithBlack.length; i += 4) {
      allFilledWithBlack.splice(i, 1, 255)
    }
    let imageData = { data: allFilledWithBlack } as unknown as ImageData
    imageDataSpy.mockImplementationOnce(() => (imageData))

    vi.spyOn(comp, 'emitEvent')
    let res = -1
    comp.addEventListener(ScratchEvents.PERCENTAGE_UPDATE, (e: CustomEvent) => (res = e.detail))

    // Act
    comp.calcAreaCleared()

    // Assert
    expect(comp.emitEvent).toBeCalledTimes(1)
    expect(res).toEqual(0)

    // Arrange
    const halfBlackHalfCleared = new Array(1200).fill(0)
    for (let i = 3; i < allFilledWithBlack.length; i += 4) {
      if (i > 601) return
      halfBlackHalfCleared.splice(i, 1, 255)
    }
    imageData = { data: halfBlackHalfCleared } as unknown as ImageData
    imageDataSpy.mockImplementationOnce(() => (imageData))

    // Act
    comp.calcAreaCleared()

    // Assert
    expect(comp.emitEvent).toBeCalledTimes(2)
    expect(res).toEqual(50)

    // Arrange
    const allCleared = new Array(1200).fill(0)
    imageData = { data: allCleared } as unknown as ImageData
    imageDataSpy.mockImplementationOnce(() => (imageData))

    // Act
    comp.calcAreaCleared()

    // Assert
    expect(comp.emitEvent).toBeCalledTimes(3)
    expect(res).toEqual(100)
  })

  it.each([false, true])('can fill the component with percentage-update: %s', async (param) => {
    // Arrange
    document.body.innerHTML = param
      ? '<wc-scratch percentage-update><p>Scratch!</p></wc-scratch>'
      : '<wc-scratch><p>Scratch!</p></wc-scratch>'
    const comp = document.querySelector('wc-scratch') as Scratch
    if (comp.context === null) return
    comp.context.canvas.width = 5
    comp.context.canvas.height = 10

    const imageDataSpy = vi.spyOn(comp.context, 'getImageData')
    const imageData = { data: new Uint8ClampedArray(900).fill(255) } as unknown as ImageData
    imageDataSpy.mockImplementationOnce(() => (imageData))

    const spy = vi.spyOn(comp.context, 'fillRect')
    const calcSpy = vi.spyOn(comp, 'emitEvent')

    // Act
    comp.fillArea()

    // Assert
    expect(spy).toBeCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(0, 0, 5, 10)
    expect(calcSpy).toBeCalledTimes(param ? 1 : 0)
    if (param) expect(calcSpy).toHaveBeenCalledWith(ScratchEvents.PERCENTAGE_UPDATE, 0)
  })

  it.each([false, true])('can clear the component with percentage-update: %s', async (param) => {
    // Arrange
    document.body.innerHTML = param
      ? '<wc-scratch percentage-update><p>Scratch!</p></wc-scratch>'
      : '<wc-scratch><p>Scratch!</p></wc-scratch>'
    const comp = document.querySelector('wc-scratch') as Scratch
    if (comp.context === null) return
    comp.context.canvas.width = 10
    comp.context.canvas.height = 5

    const imageDataSpy = vi.spyOn(comp.context, 'getImageData')
    const imageData = { data: new Uint8ClampedArray(900).fill(255) } as unknown as ImageData
    imageDataSpy.mockImplementationOnce(() => (imageData))

    const spy = vi.spyOn(comp.context, 'fillRect')
    const calcSpy = vi.spyOn(comp, 'emitEvent')

    // Act
    comp.clearArea()

    // Assert
    expect(spy).toBeCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(0, 0, 10, 5)
    expect(calcSpy).toBeCalledTimes(param ? 1 : 0)
    if (param) expect(calcSpy).toHaveBeenCalledWith(ScratchEvents.PERCENTAGE_UPDATE, 100)
  })

  it.each([false, true])('sets the scratch source image element when set: %s', async (param) => {
    // Arrange
    document.body.innerHTML = param
      ? '<wc-scratch percentage-update><p>Scratch!</p><img slot="scratch-source" src="any" /></wc-scratch>'
      : '<wc-scratch><p>Scratch!</p></wc-scratch>'
    const comp = document.querySelector('wc-scratch') as Scratch

    // Act & Assert
    if (param) {
      expect(comp.scratchSourceImage).toBeInstanceOf(HTMLImageElement)
    } else {
      expect(comp.scratchSourceImage).toBeNull()
    }
  })
})
