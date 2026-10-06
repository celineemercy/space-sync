# Local Data & Persistence — Reviewer Guide

Last verified: 6 October 2026 (Asia/Jakarta)

## Feature yang diimplementasikan

Fitur **Saved Rooms** adalah satu vertical slice dari UI sampai penyimpanan
lokal. Pengguna dapat menyimpan ruang dari halaman detail, melihat seluruh
ruang tersimpan, mengubah catatan pribadi, dan menghapus ruang tersebut.

Penyimpanan disesuaikan dengan platform:

- Android/iOS menggunakan SQLite melalui `expo-sqlite` dengan database
  `campus-space.db` dan tabel `saved_rooms`.
- Web/PWA menggunakan `window.localStorage` dengan key
  `campus-space.saved-rooms.v1`.

Data ini bersifat lokal pada device/browser dan tidak dikirim ke backend.
SQLite mempertahankan database setelah aplikasi ditutup dan dibuka kembali,
sedangkan `localStorage` mempertahankan data setelah browser di-refresh.

## Posisi kode untuk reviewer

| Tanggung jawab | Lokasi |
| --- | --- |
| Data model/entity | `mobile/src/features/saved-rooms/model.ts` |
| Storage native (SQLite) | `mobile/src/features/saved-rooms/storage.ts` |
| Storage web (`localStorage`) | `mobile/src/features/saved-rooms/storage.web.ts` |
| Repository contract dan adapter | `mobile/src/features/saved-rooms/repository.ts` |
| Use case + validasi note | `mobile/src/features/saved-rooms/use-cases.ts` |
| TanStack Query hooks | `mobile/src/features/saved-rooms/queries.ts` |
| Create UI | `mobile/src/app/(app)/room/[id].tsx` |
| Read, Update, Delete UI | `mobile/src/app/(app)/(tabs)/saved.tsx` |
| Registrasi tab | `mobile/src/app/(app)/(tabs)/_layout.tsx` |
| Persistence test web | `mobile/src/features/saved-rooms/storage.web.test.ts` |
| Widget/screen CRUD test | `mobile/src/features/saved-rooms/saved-rooms-screen.test.tsx` |

## Alur vertikal

```text
React Native screen
       ↓
TanStack Query hook
       ↓
Use case (normalisasi dan validasi)
       ↓
Repository interface
       ↓
SQLite native / localStorage web
```

Widget hanya menangani input dan presentasi. Query hook mengelola loading,
error, mutation, dan invalidasi cache. Use case membersihkan catatan serta
membatasi panjangnya sampai 200 karakter. Repository menyembunyikan detail
storage agar lapisan di atasnya tidak bergantung langsung pada SQLite atau
browser API.

## Pemetaan CRUD

| Operasi | Aksi pengguna | Implementasi storage |
| --- | --- | --- |
| Create | Tombol **Save room locally** pada Room Details | `insertSavedRoom()` / `INSERT INTO saved_rooms` |
| Read | Membuka tab **Saved** | `readSavedRooms()` / `SELECT ... ORDER BY updated_at` |
| Update | **Edit note** lalu **Save changes** | `updateSavedRoom()` / `UPDATE saved_rooms` |
| Delete | Tombol **Remove...** lalu konfirmasi | `removeSavedRoom()` / `DELETE FROM saved_rooms` |

Setiap mutation berhasil meng-invalidasi query key `saved-rooms`, sehingga UI
membaca ulang sumber lokal dan tidak menampilkan state lama. Tombol mutation
juga memakai state pending agar aksi yang sama tidak dikirim berulang kali.

## Cara demo ke reviewer

1. Login dan buka salah satu room dari tab **Search**.
2. Tekan **Save room locally**. Ini membuktikan Create.
3. Buka tab **Saved** dan tunjukkan room tersebut. Ini membuktikan Read.
4. Tekan **Edit note**, isi catatan, lalu **Save changes**. Ini membuktikan
   Update.
5. Refresh browser atau tutup lalu buka kembali aplikasi. Buka tab **Saved**
   dan tunjukkan room serta catatan masih tersedia. Ini membuktikan
   persistence.
6. Tekan **Remove...**, konfirmasi, lalu tunjukkan item hilang. Ini membuktikan
   Delete.

Pada demo web 6 October 2026, `Discussion Room A101` disimpan dan catatannya
diubah menjadi `Demo note persists after refresh`. Setelah full page refresh,
room dan catatan yang sama tetap tampil. Screenshot sebelum dan sesudah refresh
diambil dalam sesi review. Test otomatis juga mensimulasikan module reload
sebelum membaca kembali data.

## Persistence test

Jalankan dari folder `mobile/`:

```text
npm test -- --runInBand
npm run typecheck
npm run lint
```

`storage.web.test.ts` menjalankan rangkaian berikut pada storage yang sama:

1. Create data.
2. Read data.
3. Reset/reload module untuk mensimulasikan browser refresh.
4. Read ulang dan memastikan data masih ada.
5. Update data.
6. Delete data dan memastikan hasil akhirnya kosong.

Hasil verifikasi 6 October 2026:

```text
Test Suites: 6 passed, 6 total
Tests:       26 passed, 26 total
TypeScript:  passed
ESLint:      passed
Manual web:  Create, Read, Update, and refresh persistence passed
```

## Catatan desain dan keamanan data

- Query SQLite memakai parameter binding (`?`), bukan menyusun nilai pengguna
  langsung ke string SQL.
- `room_id` dibuat unik agar satu room tidak tersimpan dua kali.
- Nilai note di-trim dan divalidasi maksimal 200 karakter pada use case.
- JSON web yang rusak ditangani sebagai daftar kosong agar UI tidak crash.
- Saved Rooms bukan data otoritatif reservasi; data booking tetap divalidasi
  oleh backend.

## AI assistance disclosure

Prompt yang digunakan:

```text
Implement one vertical Local Data & Persistence feature in the existing React
Native + Expo project. Use SQLite on native and localStorage on web, define a
data model, implement Create/Read/Update/Delete, prove persistence after an app
restart or browser refresh, add tests and reviewer documentation, and commit
each logical change separately.
```

Codex membantu membuat boilerplate storage, repository/use case, UI, test, dan
dokumentasi. Bagian yang diperiksa dan diperbaiki secara manual selama review:

- kesesuaian API `expo-sqlite` dengan Expo SDK 57;
- pemisahan UI, query, use case, repository, dan platform storage;
- parameterized SQL dan unique constraint;
- invalidasi query setelah Create, Update, dan Delete;
- skenario persistence setelah reload;
- loading/pending guard pada aksi mutation;
- regresi halaman detail ketika interval booking belum dipilih;
- hasil Jest, TypeScript, ESLint, Docker build, dan demo browser.

Mahasiswa tetap perlu memahami alur di atas dan menjelaskannya dengan kata-kata
sendiri ketika review.

## Commit terpisah untuk tugas ini

- `42fd0e4` — persistence layer, model, repository, use case, dan query hooks.
- `9ad92dc` — UI CRUD Saved Rooms.
- `6b3f7c8` — pemisahan konstanta model dari storage driver untuk testability.
- `ec6ac82` — persistence test dan widget test CRUD.
- `01e6197` — perbaikan halaman detail untuk interval booking yang belum ada.
- Dokumentasi ini dibuat pada commit tersendiri.
