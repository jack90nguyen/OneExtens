# OneExtens (Chrome Extension)

Chrome Extension (Manifest V3) with two tools for frontend testing:

- **Auto Fill Form** - autofills only form fields that are currently visible, interactable, and fully inside the viewport.
- **Capture Full Page** - takes a full-page screenshot by scrolling and stitching the visible viewport captures.
- **Checkerboard** - automatically paints a checkerboard behind any standalone image page so PNG transparency is visible.
- **Toggle Password** - flips every password field on the page to plain text and back, so a typed password can be checked.

It is designed for frontend testing on real pages with overlays/modals, and avoids filling hidden or covered fields.

## Features

- Supports `input`, `textarea`, and `select`
- Supported input types:
  - `text`, `email`, `search`, `password`, `number`, `checkbox`, `radio`
- Filtering pipeline before fill:
  1. Visible check
  2. Interactable / not covered check
  3. In-viewport check
- Modal-priority mode (if modal containers exist, fields inside them are prioritized)
- Trigger methods:
  - Click extension icon to autofill active page
  - Keyboard shortcut: `Alt + Shift + F`
- Error-only feedback: successful runs are silent; failures show an alert on the active tab
- Dispatches `input` and `change` events for SPA compatibility (React/Vue/Angular)
- Randomized natural data generation with layered data sources:
  1. user dataset (`chrome.storage.sync`)
  2. extension defaults
  3. built-in fallback values
- Options page dataset editor (names, emails, phones, addresses, companies, urls, default password, paragraph, min/max words)
- Duplicate prevention cache per autofill session for key text-like datasets
- Additional randomized field support:
  - `input[type=date]` random date in the last 5 years
  - `input[type=url]` from URL dataset
  - `input[type=tel]` natural/random phone formats
  - `input[type=number]` random in field min/max or default range `1..999`

## Full Page Screenshot

- Trigger: click the extension icon, then **Capture Full Page**.
- The page is scrolled from top to bottom, each viewport is captured, and the slices are stitched into one PNG.
- Elements with `position: fixed` or `position: sticky` are hidden after the first slice so headers/banners are not repeated down the image, then restored when the capture ends.
- The original scroll position is restored after the capture.
- The result opens in a new tab with a preview and a **Download PNG** button.
- Uses only the already granted `activeTab` permission (no `debugger`, no `downloads`).

Known limits:

- Capturing is throttled to Chrome's 2 calls/second quota for `captureVisibleTab`, so a long page takes a few seconds and the page visibly scrolls while it runs.
- Content inside an internal scroll container (not the page scroll) is only captured as far as it is visible.
- Lazy-loaded media may not finish loading within the settle delay.
- Very tall pages are clamped to the maximum canvas size; the viewer shows a warning when the bottom was cut off.
- `chrome://` pages, the Chrome Web Store, and the PDF viewer cannot be captured.

## Checkerboard (PNG Alpha)

When Chrome opens an image URL directly it sets an inline `background-color` on the `<img>` element (light gray in dark mode), so a transparent PNG looks like it has a solid background.

- Applied automatically: opening any `image/*` URL paints the checkerboard, no click needed.
- Click the extension icon then **Toggle Checkerboard** to turn it off for the current page and see the image as Chrome renders it; click again to turn it back on.
- The checkerboard is written as an inline `!important` background on the image, because Chrome's own inline style cannot be overridden from an injected stylesheet.
- Chrome rewrites the whole `style` attribute when the image is zoomed, so a `MutationObserver` watches the attribute and repaints. The observer is disconnected while painting: its callbacks run as microtasks, so a boolean guard would already be cleared by the time they fire.
- The last style Chrome wrote is kept, so turning the checkerboard off restores that exact attribute.
- Runs for any `image/*` document, not just PNG (opaque formats simply cover the pattern).
- The pattern is fixed at 24px in CSS pixels, so it does not scale when the image is zoomed.

## Toggle Password

- Trigger: click the extension icon, then **Toggle Password**.
- First click switches every `input[type=password]` on the page to `type=text`; the next click switches the same fields back.
- The typed value is preserved across both directions.
- Fields removed from the DOM in between are skipped on the way back.
- Pages with no password field get an alert instead.

Known limits:

- Only the top frame is handled, same as autofill: a login form inside an `<iframe>` is not reached.
- Fields inside a shadow DOM are not found.
- An SPA re-render can reset the field back to `password`; click again.

## Autofill Rules

| Field | Value |
|---|---|
| text | random item from names dataset |
| email | random email dataset item or generated `firstname.lastname@domain` |
| password | configured default password (fallback `123456`) |
| number | random number in min/max range |
| checkbox | random boolean (50/50) |
| radio | one random visible radio in the group |
| textarea | random paragraph slice (`minWords`..`maxWords`) |
| select | random valid option (skips disabled/placeholder) |
| date | random date in last 5 years |
| url | random URL dataset item |
| tel | random phone dataset item or generated phone format |

### Smart Field Detection

The extension detects semantic field types using:
- input `type`
- attribute heuristics from `name`, `id`, `placeholder`, `aria-label`, `autocomplete`

Examples:
- `customer_email` -> email dataset
- `billing_address` -> address dataset
- `company_name` -> company dataset
- `contact_phone` -> phone dataset

## Project Structure

```text
autofill-extension/
  manifest.json
  background/
    service-worker.js
  content/
    content-script.js
    autofill.js
    capture.js
    alpha-checker.js
    password-toggle.js
  data/
    dataset-manager.js
    random-generator.js
    field-detector.js
  utils/
    visibility.js
    interactable.js
    viewport.js
  options/
    options.html
    options.js
  popup/
    popup.html
    popup.js
    popup.css
    viewer.html
    viewer.js
    viewer.css
```

## Install (Load Unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder (the one containing `manifest.json`)

## Usage

- Open any page with forms.
- Click the extension icon to open the menu, then click **Auto Fill Form**.
- To screenshot the whole page, open the menu and click **Capture Full Page**.
- Opening a PNG URL shows a checkerboard automatically; use **Toggle Checkerboard** to turn it off for that page.
- To read a password you are typing, open the menu and click **Toggle Password**.
- Or press `Alt + Shift + F` while the page is focused.
- To customize dataset values, right click extension icon -> **Options**.
- Autofill success has no popup/status message; only errors are alerted.
- Click **Save Dataset** to persist custom values in `chrome.storage.sync`.
- Click **Restore Defaults** to reset back to extension defaults.

## Validation Scenarios

### Scenario 1: Page form + overlay + modal form

Expected:
- Only modal fields are filled (if modal selectors are present and fields are eligible)
- Covered/background form fields are skipped

### Scenario 2: Hidden form fields

Examples:
- `display: none`
- `visibility: hidden`
- `opacity: 0`
- `pointer-events: none`

Expected:
- Hidden fields are ignored

### Scenario 3: Fields outside viewport

Expected:
- Out-of-viewport fields are ignored

## Notes

- The extension intentionally avoids autofilling non-interactable elements.
- It does not require build tooling or extra configuration.
