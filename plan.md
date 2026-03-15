# Plan: Autofill Extension - One-Click Runtime + Options Config

## Objective / Muc tieu

Xay dung va duy tri Chrome Extension (Manifest V3) co luong su dung toi uu:

- Click icon extension de autofill ngay tren tab hien tai.
- Dung `Alt + Shift + F` de trigger nhanh bang ban phim.
- Cau hinh dataset thong qua trang **Options** (menu right click icon -> Options).
- Chi thong bao khi co loi; thanh cong thi chay im lang.

## Constraints / Rang buoc

- Khong thay doi hoac them moi database/model ben ngoai extension.
- Chi luu user dataset trong `chrome.storage.sync`.
- Khong autofill field hidden, bi che, hoac nam ngoai viewport.
- Khong them telemetry/tracking/network call cho autofill logic.

## Current UX Flow

1. **Trigger autofill**
   - User click icon extension, hoac nhan `Alt + Shift + F`.
2. **Background action click**
   - `background/service-worker.js` gui message `RUN_AUTOFILL` den content script.
3. **Runtime autofill pipeline**
   - `content/autofill.js` scan + filter + detect + random + apply + dispatch events.
4. **Error handling**
   - Neu that bai, service worker inject `alert()` de thong bao loi tren page.
5. **Options dataset config**
   - User vao `Options` de load/save/restore dataset.

## Runtime Workflow / Quy trinh chi tiet

1. **Scan fields**
   - Query selector: `input, textarea, select`.
2. **Eligibility filtering**
   - `isVisible`
   - `isInteractable`
   - `isInViewport`
3. **Modal priority**
   - Neu ton tai dialog/modal hop le, uu tien fill field ben trong modal.
4. **Field type detection**
   - Dua tren `input.type` + heuristic (`name/id/placeholder/aria-label/autocomplete`).
5. **Dataset resolution**
   - Merge thu tu: user config -> defaults -> fallback.
6. **Random value generation**
   - Ho tro text/email/company/address/phone/url/paragraph/date/number/search/checkbox/radio/select.
7. **Apply + event dispatch**
   - Set value/checked/selectedIndex.
   - Dispatch `input` va `change` de tuong thich SPA frameworks.

## Modules and Responsibilities

### `background/service-worker.js`

- Lang nghe `chrome.action.onClicked`.
- Gui `RUN_AUTOFILL` den active tab.
- Khi loi: show `alert()` bang `chrome.scripting.executeScript`.
- Khi thanh cong: khong hien thi thong bao.

### `content/content-script.js`

- Nhan message `RUN_AUTOFILL` va goi `runAutofill()`.
- Tra response `{ ok: true, result }` hoac `{ ok: false, error }`.
- Ho tro keyboard shortcut `Alt + Shift + F`.

### `content/autofill.js`

- Ham entry: `runAutofill()`.
- Xu ly full autofill pipeline va tra ket qua:

```js
{
  scanned: number,
  eligible: number,
  filled: number
}
```

### `data/dataset-manager.js`

- API chinh:
  - `getEffectiveDatasets()`
  - `saveUserConfig(datasets)`
  - `restoreDefaultConfig()`
- Normalize input va merge defaults/fallback.

### `data/random-generator.js`

- Utility random: `randomInt`, `randomItem`, `randomBoolean`, `shuffle`.
- Sinh paragraph theo `minWords/maxWords`.
- Generate value theo semantic type + session cache (giam trung lap).

### `data/field-detector.js`

- `detectFieldType(field)` theo direct type + hint keywords.

### `options/options.html` + `options/options.js`

- UI chinh sua dataset.
- Action:
  - load data khi mo trang
  - save dataset
  - restore defaults
- Hien status tren options page cho thao tac save/restore/load.

## Data Contract / Dataset Shape

```js
{
  text: string[],
  email: string[],
  company: string[],
  address: string[],
  phone: string[],
  url: string[],
  paragraph: string,
  minWords: number,
  maxWords: number
}
```

## Error Handling Policy

- Khong de uncaught error thoat khoi message handler.
- Content script response phai theo format `{ ok, error? }`.
- Service worker thong bao loi bang `alert()` tren tab hien tai.
- Options page phai cap nhat status khi load/save/restore that bai.

## Validation Checklist

1. Mo `chrome://extensions`, reload extension.
2. Mo trang co form va click icon extension -> form duoc fill.
3. Thu keyboard shortcut `Alt + Shift + F`.
4. Thu tren trang khong ho tro inject script (`chrome://...`) -> co alert loi.
5. Right click icon -> Options, sua dataset, Save.
6. Chay autofill lai va xac nhan du lieu moi duoc su dung.
7. Thu Restore Defaults va xac nhan reset thanh cong.
8. Kiem tra hidden/covered/out-of-viewport fields van bi bo qua.
9. Kiem tra modal-priority van dung.

## Related Files

- `manifest.json`
- `background/service-worker.js`
- `content/content-script.js`
- `content/autofill.js`
- `data/dataset-manager.js`
- `data/random-generator.js`
- `data/field-detector.js`
- `utils/visibility.js`
- `utils/interactable.js`
- `utils/viewport.js`
- `options/options.html`
- `options/options.js`
- `README.md`

## Next Improvements (Optional)

- Bo sung test harness (unit tests cho detector/random/dataset manager).
- Bo sung validation chi tiet hon trong options form (field-level errors).
- Can nhac i18n labels cho options UI neu mo rong doi tuong su dung.
