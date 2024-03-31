# wc-scratch 🧽

A fun scratch card native web component without any dependencies.

## 🎉 Installation

Install it ith npm:

```
npm i wc-scratch
```

Or link it using a script tag:

```html
<script type="module" src="https://unpkg.com/wc-scratch@latest/dist/wc-scratch.js"></script>
```

## ✨ Usage

Import the component - this will also register it as a custom element with the tag name `<wc-scratch>`:

```ts
import 'wc-scratch'
```

Now you can use the component in your markup:

```html
<wc-scratch>
  <h1 style="margin: 0">Scratch me free!</h1>
</wc-scratch>
```

## ⚙️ Configuration

### 🎰 Slot

| Slot name | Description |
|-----------|-------------|
| default | The content to be scratched free. |
| scratch-source | Used to pass an image that acts as a scratch-color replacement. |

Example on how to use the `scratch-source` slot:

```html
<wc-scratch>
  <h1>Scratch me!</h1>
  <img slot="scratch-source" crossorigin style="display: none;" src="https://example.com/example.jpeg" alt="image" />
</wc-scratch>
```

- To get the best experience make sure that your content is the same size as the image used to hide it.
- You need to set `display: none` on this image so the original is getting hidden. We only read its image data and paint it on the canvas.
- For images fetched over the internet you also need to set `crossorigin` if you want to use the `percentage-update` feature or else the `CanvasRenderingContext2D: getImageData()` will throw an error.

### 💡 Props

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| brush-size | number | `10` | Defines the [`lineWidth` attribute.](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineWidth) |
| brush-shape | string | `'round'` | Defines the [`lineJoin` attribute.](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineJoin) |
| scratch-color | string | `'#000000'` | The color you want to scratch away with your scratch card. Can be any valid CSS color.
| percentage-update | boolean | `false` | Flag to toggle the `percentage-update` event emitter on or off. |

### 🎈 Events

| Name | Type | Description |
|------|------|-------------|
| percentage-update | `{ detail: number }` | Emits a custom event with the cleared amount as a percentage. |

Example:

```html
<script>
  const scratch = document.querySelector('wc-scratch[percentage-update]')
  scratch.addEventListener('percentage-update', ({ detail }) => console.log(detail))
</script>
```

## ✔️ Caveats 

1. Please avoid using `margin` on a content element since it can lead to improper sizing of the `canvas` element and therefore the content might be visible.

2. Calculation of the cleared area is rounded with a 150 pixel error margin.
