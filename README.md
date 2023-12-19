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
  <h1 style="margin:0">Scratch me free!</h1>
</wc-scratch>
```

## ⚙️ Configuration

### 🎰 Slot

| Slot name | Description |
|-----------|-------------|
| default | The content to be scratched free. |

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
