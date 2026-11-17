# Miu học tiếng Anh

Web app học tiếng Anh giao tiếp hằng ngày cho bé 4–6 tuổi. Mỗi bài dài 3–5 phút với 5 bước: xem tình huống, nghe và chạm, nói theo, trò chơi, phần thưởng. Bé không cần đọc chữ; phụ huynh có khu vực riêng để xem tiến độ và đặt giới hạn thời gian; người soạn nội dung có tài khoản riêng ở `/admin` để thêm bài mà không cần sửa code.

Công nghệ: TypeScript, Next.js 16 (React 19), PostgreSQL, Prisma 7, Zod.

## Chạy lần đầu

Cần Node.js 22 trở lên và Docker.

```bash
npm install
cp .env.example .env          # giá trị mặc định khớp với docker-compose.yml
docker compose up -d          # bật PostgreSQL
npx prisma migrate dev --name init   # tạo bảng, sinh thư mục prisma/migrations (nhớ commit)
npx prisma db seed            # tài khoản tạo sẵn, 1 hồ sơ bé, 8 chủ đề, 2 bài đầu
npm run dev
```

Mở http://localhost:3000.

Lưu ý với Prisma 7: `migrate dev` không tự chạy seed, nên bước `db seed` phải gõ riêng. Chạy lại seed bao nhiêu lần cũng an toàn, nó chỉ thêm cái còn thiếu.

Database đã tạo từ trước: chạy `npx prisma migrate dev` để áp các migration mới (ví dụ `staff_sessions`, thêm tài khoản soạn bài riêng).

## Đăng nhập

Đợt dùng trong nhà chưa gửi email. Nhập email, rồi **mã 6 số hiện trong cửa sổ dòng lệnh đang chạy `npm run dev`**. Có hai loại tài khoản, đăng nhập riêng:

| | Phụ huynh | Người soạn bài |
|---|---|---|
| Trang đăng nhập | `/login` | `/admin/login` (mở `/admin` sẽ tự chuyển tới) |
| Tài khoản | bảng `parents`; seed tạo `phuhuynh@miu.local` (`SEED_PARENT_EMAIL`) | bảng `staff`; seed tạo theo `SEED_STAFF_EMAIL`, bỏ trống thì trùng email phụ huynh |
| Phiên | 90 ngày, cookie `miu_session` | 30 ngày, cookie `miu_staff_session` |
| Cổng phụ huynh (phép cộng) | cần, cho khu phụ huynh | không cần |

Cùng một email có thể vừa là phụ huynh vừa là người soạn: mỗi bên xin mã và đăng nhập riêng, mã của bên này không dùng được cho bên kia, đăng xuất bên này không ảnh hưởng bên kia. Phiên tự gia hạn mỗi lần mở app. Xóa tài khoản phụ huynh không xóa tài khoản soạn bài.

Thêm người soạn bài: thêm một dòng vào bảng `staff` (ví dụ bằng `npx prisma studio`), hoặc đặt `SEED_STAFF_EMAIL` rồi chạy lại seed. Người soạn không cần có tài khoản phụ huynh. Bỏ dòng khỏi bảng `staff` thì mọi phiên của người đó mất hiệu lực ngay. Cột `role` hiện chưa dùng: mọi người soạn đều có toàn quyền, kể cả xuất bản.

Muốn khỏi đọc mã mỗi lần khi phát triển, bỏ dấu `#` ở dòng `MIU_DEV_FIXED_CODE` trong `.env`. Dòng này chỉ có tác dụng khi chạy `npm run dev`; khi chạy `npm start` (chế độ thật) nó bị bỏ qua.

## Cách dùng

- **Bé:** màn hình đầu hiện ảnh các bé. Chạm vào ảnh của mình, rồi chọn bài trên bản đồ chủ đề. Chủ đề sau mở khi học xong chủ đề trước.
- **Phụ huynh:** chạm biểu tượng người ở góc trên màn hình đầu, giải phép cộng ở cổng phụ huynh (hiệu lực 10 phút). Ở đó có tổng quan tiến độ, thêm/sửa/xóa hồ sơ bé, giới hạn thời gian học mỗi ngày, xóa tài khoản.
- **Soạn bài:** mở thẳng `/admin` rồi đăng nhập bằng email người soạn. Khu này tách khỏi khu phụ huynh: không có nút nào dẫn tới từ màn hình bé hay khu phụ huynh, và không cần qua phép cộng.

## Soạn bài mới

1. Vào `/admin` (đăng nhập ở `/admin/login`), tạo bài mới: chọn chủ đề, đặt tên và mã bài, chọn một bài có sẵn để nhân bản 5 bước.
2. Sửa cấu hình từng bước (JSON). Cấu hình sai lược đồ bị từ chối và báo rõ chỗ sai; bản đã xuất bản không bị ảnh hưởng.
3. Mục "Câu và tiếng": thêm câu mới, sửa chữ, tải tệp WAV cho từng giọng.
4. "Xem trước" chạy bài đúng như bé thấy, không ghi tiến độ; bấm 5 chấm để nhảy bước.
5. "Xuất bản": kiểm tra cấu hình, tăng số phiên bản, ghi gói bài. Bé đang học dở bản cũ vẫn học tiếp bản cũ.

Hình minh họa nằm trong code (`src/lesson-engine/art.ts`). Bài chỉ dùng được các khóa hình, giọng và nét mặt có trong `src/lib/content-keys.ts`; muốn thêm hình mới thì vẽ thêm ở `art.ts` rồi thêm khóa vào danh sách đó.

## Tệp tiếng

Tệp gốc luôn là **WAV không nén, 48 kHz, 16 bit, một kênh**; tệp khác bị từ chối. Khi tải lên, nếu máy có `ffmpeg` thì app tự tạo bản MP3 và AAC (cân bằng âm lượng, cắt khoảng lặng hai đầu) để bé nghe; không có `ffmpeg` thì bé nghe thẳng WAV (nặng hơn nhưng vẫn phát được).

Bài chưa có tệp tiếng cho đủ câu thì **bị chặn khi xuất bản**. Để phát triển khi chưa có tệp tiếng, `.env.example` bật `MIU_ALLOW_MISSING_AUDIO=1`: bài vẫn xuất bản được và bé nghe giọng dự phòng của trình duyệt (giọng tiếng Việt có thể không có trên máy). Khi chạy thật, xóa dòng này.

## Thư mục

```
prisma/schema.prisma      19 bảng: tài khoản, nội dung, tiến độ
prisma/seed.ts            dữ liệu mẫu
src/lib/                  database, đăng nhập (auth.ts phụ huynh, staff-auth.ts người soạn), cổng phụ huynh, sự kiện học, xuất bản, kho tệp, lược đồ Zod
src/lesson-engine/        máy chạy bài 5 bước, thư viện hình SVG, âm thanh, hàng đợi đồng bộ
src/app/(kid)/            màn hình của bé
src/app/parent/           khu vực phụ huynh
src/app/admin/            soạn bài (đăng nhập riêng ở src/app/admin/login)
src/app/preview/          xem trước bài nháp
src/app/api/              các endpoint
storage/                  gói bài và tệp tiếng (khi chưa dùng Cloudflare R2)
tests/                    kiểm thử
```

## Kiểm thử

```bash
npm test                  # kiểm thử đơn vị, không cần database
```

Kiểm thử API cần app đang chạy ở chế độ phát triển và `MIU_DEV_FIXED_CODE="246810"` trong `.env`:

```bash
npm run dev               # cửa sổ 1
BASE_URL=http://localhost:3000 npm run test:api   # cửa sổ 2
```

Bộ kiểm thử API tạo dữ liệu thử rồi tự xóa; nó cũng xóa mã đăng nhập của tài khoản seed trước khi chạy.

## Khi triển khai thật

- Đặt `SESSION_SECRET` là chuỗi ngẫu nhiên dài; bỏ `MIU_ALLOW_MISSING_AUDIO` và `MIU_DEV_FIXED_CODE`.
- Chạy `npx prisma migrate deploy` thay cho `migrate dev`, rồi `npm run build && npm start`.
- **Email:** thay hàm trong `src/lib/mail.ts` bằng dịch vụ gửi email thật. Chỗ khác không cần đổi.
- **Cloudflare R2:** thay ba hàm `put/get/exists` trong `src/lib/storage.ts` bằng bản dùng API S3. Đường dẫn `/files/...` khi đó nên trỏ thẳng tới CDN phía trước R2.
- Khi mở cho gia đình khác, cần thêm màn hình đăng ký, điều khoản đồng ý về dữ liệu của trẻ và rà soát pháp lý (xem tài liệu thiết kế).

## Giới hạn đã biết

- Bài đang học dở mà thoát giữa chừng thì lần sau vào đúng bước nhưng mất số sao đã kiếm ở các bước trước.
- Giới hạn thời gian chỉ chặn ở màn hình bản đồ và lúc mở bài; app không ngắt giữa bài.
- Bước "nói theo" chỉ phát lại giọng bé tại chỗ, không chấm điểm và không gửi đi đâu.
- Chưa có chế độ học khi mất mạng hoàn toàn (tiến độ thì vẫn lưu tạm và gửi sau).
- Trang phụ huynh và quản trị dùng CSS tự viết, chưa dùng shadcn/ui.
- Cổng phụ huynh là một phép cộng, đủ để bé nhỏ không vào nhầm, không phải biện pháp bảo mật.
