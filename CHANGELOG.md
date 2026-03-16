# CHANGELOG

## 2026-03-16 (today)

#### 1. Khởi tạo chức năng Autofill theo hiển thị thực tế
- Khởi tạo project Chrome Extension (Manifest V3) mang tên "OneFill".
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
- Đổi tên thương hiệu thành OneFill và cập nhật bộ biểu tượng (icon) mới cho extension.

#### 4. Tài liệu và Hướng dẫn
- Bổ sung và cập nhật đồng bộ các file tài liệu thiết kế và hướng dẫn như `README.md` và `plan.md`.
- Thêm tệp `AGENTS.md` hướng dẫn quy chuẩn lập trình và cấu trúc dự án chi tiết cho các lập trình viên hoặc bot phát triển.