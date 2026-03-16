# Plan: Autofill Extension - One-Click Runtime + Options Config

## Objective / Mục tiêu

Xây dựng và duy trì Chrome Extension (Manifest V3) có luồng sử dụng tối ưu:

- Click icon extension để autofill ngay trên tab hiện tại.
- Dùng `Alt + Shift + F` để trigger nhanh bằng bàn phím.
- Cấu hình dataset thông qua trang **Options** (menu right click icon -> Options).
- Chỉ thông báo khi có lỗi; thành công thì chạy im lặng.

## Constraints / Ràng buộc

- Không thay đổi hoặc thêm mới database/model bên ngoài extension.
- Chỉ lưu user dataset trong `chrome.storage.sync`.
- Không autofill field hidden, bị che, hoặc nằm ngoài viewport.
- Không thêm telemetry/tracking/network call cho autofill logic.

## Current UX Flow

1. **Trigger autofill**
   - User click icon extension, hoặc nhấn `Alt + Shift + F`.
2. **Background action click**
   - `background/service-worker.js` gửi message `RUN_AUTOFILL` đến content script.
3. **Runtime autofill pipeline**
   - `content/autofill.js` scan + filter + detect + random + apply + dispatch events.
4. **Error handling**
   - Nếu thất bại, service worker inject `alert()` để thông báo lỗi trên page.
5. **Options dataset config**
   - User vào `Options` để load/save/restore dataset.

## Runtime Workflow / Quy trình chi tiết

1. **Scan fields**
   - Query selector: `input, textarea, select`.
2. **Eligibility filtering**
   - `isVisible`
   - `isInteractable`
   - `isInViewport`
3. **Modal priority**
   - Nếu tồn tại dialog/modal hợp lệ, ưu tiên fill field bên trong modal.
4. **Field type detection**
   - Dựa trên `input.type` + heuristic (`name/id/placeholder/aria-label/autocomplete`).
5. **Dataset resolution**
   - Merge thứ tự: user config -> defaults -> fallback.
6. **Random value generation**
   - Hỗ trợ text/email/company/address/phone/url/password/paragraph/date/number/search/checkbox/radio/select.
7. **Apply + event dispatch**
   - Set value/checked/selectedIndex.
   - Dispatch `input` và `change` để tương thích SPA frameworks.

## Modules and Responsibilities

### `background/service-worker.js`

- Lắng nghe `chrome.action.onClicked`.
- Gửi `RUN_AUTOFILL` đến active tab.
- Khi lỗi: show `alert()` bằng `chrome.scripting.executeScript`.
- Khi thành công: không hiển thị thông báo.

### `content/content-script.js`

- Nhận message `RUN_AUTOFILL` và gọi `runAutofill()`.
- Trả response `{ ok: true, result }` hoặc `{ ok: false, error }`.
- Hỗ trợ keyboard shortcut `Alt + Shift + F`.

### `content/autofill.js`

- Hàm entry: `runAutofill()`.
- Xử lý full autofill pipeline và trả kết quả:

```js
{
  scanned: number,
  eligible: number,
  filled: number
}
```

### `data/dataset-manager.js`

- API chính:
  - `getEffectiveDatasets()`
  - `saveUserConfig(datasets)`
  - `restoreDefaultConfig()`
- Normalize input và merge defaults/fallback.

### `data/random-generator.js`

- Utility random: `randomInt`, `randomItem`, `randomBoolean`, `shuffle`.
- Sinh paragraph theo `minWords/maxWords`.
- Generate value theo semantic type + session cache (giảm trùng lặp).

### `data/field-detector.js`

- `detectFieldType(field)` theo direct type + hint keywords.

### `options/options.html` + `options/options.js`

- UI chỉnh sửa dataset.
- Action:
  - load data khi mở trang
  - save dataset
  - restore defaults
- Hiện status trên options page cho thao tác save/restore/load.

## Data Contract / Dataset Shape

```js
{
  text: string[],
  email: string[],
  company: string[],
  address: string[],
  phone: string[],
  url: string[],
  password: string,
  paragraph: string,
  minWords: number,
  maxWords: number
}
```

## Error Handling Policy

- Không để uncaught error thoát khỏi message handler.
- Content script response phải theo format `{ ok, error? }`.
- Service worker thông báo lỗi bằng `alert()` trên tab hiện tại.
- Options page phải cập nhật status khi load/save/restore thất bại.

## Validation Checklist

1. Mở `chrome://extensions`, reload extension.
2. Mở trang có form và click icon extension -> form được fill.
3. Thử keyboard shortcut `Alt + Shift + F`.
4. Thử trên trang không hỗ trợ inject script (`chrome://...`) -> có alert lỗi.
5. Right click icon -> Options, sửa dataset, Save.
6. Chạy autofill lại và xác nhận dữ liệu mới được sử dụng.
7. Thử Restore Defaults và xác nhận reset thành công.
8. Kiểm tra hidden/covered/out-of-viewport fields vẫn bị bỏ qua.
9. Kiểm tra modal-priority vẫn đúng.

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

- Bổ sung test harness (unit tests cho detector/random/dataset manager).
- Bổ sung validation chi tiết hơn trong options form (field-level errors).
- Cân nhắc i18n labels cho options UI nếu mở rộng đối tượng sử dụng.
