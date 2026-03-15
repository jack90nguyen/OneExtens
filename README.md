# Visible Form Autofill (Chrome Extension)

Chrome Extension (Manifest V3) that autofills only form fields that are currently visible, interactable, and fully inside the viewport.

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
- Dispatches `input` and `change` events for SPA compatibility (React/Vue/Angular)
- Randomized natural data generation with layered data sources:
  1. user dataset (`chrome.storage.sync`)
  2. extension defaults
  3. built-in fallback values
- Options page dataset editor (names, emails, phones, addresses, companies, urls, paragraph, min/max words)
- Duplicate prevention cache per autofill session for key text-like datasets
- Additional randomized field support:
  - `input[type=date]` random date in the last 5 years
  - `input[type=url]` from URL dataset
  - `input[type=tel]` natural/random phone formats
  - `input[type=number]` random in field min/max or default range `1..999`

## Autofill Rules

| Field | Value |
|---|---|
| text | random item from names dataset |
| email | random email dataset item or generated `firstname.lastname@domain` |
| password | `123456` |
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
```

## Install (Load Unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder (the one containing `manifest.json`)

## Usage

- Open any page with forms.
- Click the extension icon to run autofill on the active page.
- Or press `Alt + Shift + F` while the page is focused.
- To customize dataset values, right click extension icon -> **Options**.
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
