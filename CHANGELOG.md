# CHANGELOG

## 2026-10-20

#### 1. Nền caro cho ảnh PNG (Checkerboard)
- Mở bất kỳ link ảnh nào là **tự động** có nền caro, không cần thao tác - để nhìn ra ngay vùng nào trong suốt. Thêm content script `content/alpha-checker.js` (`window.__autofillChecker`).
- Nguyên nhân cần xử lý: Chrome image document tự gắn **inline style** `background-color: hsl(0, 0%, 90%)` lên thẻ `<img>` (dark mode) - stylesheet inject từ extension không đè được, nên phải set inline `!important` thẳng lên element.
- Chrome ghi đè nguyên `style` attribute mỗi lần zoom ảnh -> dùng `MutationObserver` canh và vẽ lại. Observer được disconnect trong lúc vẽ: callback của nó chạy ở microtask nên cờ boolean sẽ bị reset trước khi callback nổ (đã dính bug này lúc test, đổi sang disconnect/reconnect mới đúng).
- Giữ lại chuỗi style mà Chrome ghi gần nhất -> nút **Toggle Checkerboard** tắt đi là trả về đúng y nguyên.
- Chỉ chạy khi `document.contentType` là `image/*`; trang khác thoát ngay.
- Không thêm permission: tái dùng `content_scripts` trên `<all_urls>` sẵn có.

## 2026-09-21

#### 1. Chụp ảnh full trang (Capture Full Page)
- Thêm chức năng chụp toàn bộ trang web: cuộn trang theo từng viewport, chụp `captureVisibleTab` rồi ghép các lát lại thành một ảnh PNG duy nhất bằng `OffscreenCanvas` trong service worker.
- Ẩn các element `position: fixed` / `sticky` từ lát thứ 2 trở đi để header/banner không bị lặp lại dọc ảnh, khôi phục nguyên trạng (kể cả vị trí scroll) sau khi chụp xong.
- Ảnh kết quả mở ở tab mới (`popup/viewer.html`) kèm preview và nút **Download PNG**; cảnh báo khi trang quá dài bị cắt bớt do giới hạn canvas.
- Không thêm permission mới: dùng lại `activeTab` + `scripting` sẵn có (không dùng `chrome.debugger`).
- Thêm nút **Capture Full Page** vào popup menu.

#### 2. Cập nhật bộ icon
- Regen toàn bộ icon (16/32/48/128 + favicon 512) từ `logo.png`, crop bỏ vùng trong suốt và shadow thừa để logo chiếm tối đa khung hiển thị.

## 2026-03-16

#### 1. Khởi tạo chức năng Autofill theo hiển thị thực tế
- Khởi tạo project Chrome Extension (Manifest V3) mang tên "OneExtens".
- Xây dựng logic quét và tự động điền form, nhưng chỉ áp dụng trên các trường dữ liệu thực sự hiển thị với người dùng (visible, interactable và in viewport).
- Tích hợp cơ chế tự động nhận diện và ưu tiên điền các trường dữ liệu nằm bên trong Modal/Dialog.
- Tự động kích hoạt các sự kiện `input` và `change` để tương thích với các framework Single Page Application (React, Vue, Angular).

#### 2. Hệ thống sinh dữ liệu ngẫu nhiên & Tùy chỉnh Dataset
- Tích hợp bộ máy sinh dữ liệu tự nhiên dựa trên việc nhận diện loại trường (nhận diện thông minh qua type/name/id như email, phone, company, address, url...).
- Hỗ trợ tạo nội dung đoạn văn (paragraph) ngẫu nhiên theo cấu hình giới hạn số từ (min/max words).
- Sử dụng bộ nhớ đệm (session cache) trong mỗi phiên autofill nhằm hạn chế việc sinh trùng lặp giá trị trên cùng một màn hình.
- Xây dựng trang Options, cho phép người dùng thêm bớt và tùy chỉnh các tập dữ liệu test (kể cả thiết lập mật khẩu mặc định) và lưu qua `chrome.storage.sync`.

#### 3. Tối ưu hóa UX (One-click Autofill)
- Tối ưu hóa luồng tương tác: Người dùng có thể chạy autofill ngay lập tức bằng 1 click vào biểu tượng extension hoặc bằng phím tắt (`Alt + Shift + F`), thay vì phải mở menu popup.
- Hoạt động im lặng (silent): Quá trình điền dữ liệu diễn ra ngầm khi thành công; chỉ hiển thị thông báo lỗi (bằng `alert`) nếu có vấn đề xảy ra trên trang.
- Đổi tên thương hiệu thành OneExtens và cập nhật bộ biểu tượng (icon) mới cho extension.

#### 4. Tài liệu và Hướng dẫn
- Bổ sung và cập nhật đồng bộ các file tài liệu thiết kế và hướng dẫn như `README.md` và `plan.md`.
- Thêm tệp `AGENTS.md` hướng dẫn quy chuẩn lập trình và cấu trúc dự án chi tiết cho các lập trình viên hoặc bot phát triển.