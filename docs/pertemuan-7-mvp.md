# Pertemuan 7: MVP CampusSpace

## Alur demo

1. Jalankan PostgreSQL dan API, terapkan migrasi, lalu seed data menurut [testing guide](testing-guide.md). Gunakan akun demo dan kata sandi dari `.env` lokal.
2. Masuk di Android. Halaman Search menampilkan ruang; pilih tanggal dan rentang waktu mendatang, kapasitas, serta fasilitas. Form menolak akhir waktu yang tidak lebih lambat dan awal waktu yang sudah lewat.
3. Jalankan Search availability, buka detail ruang yang tersedia, lalu konfirmasi reservasi. API memeriksa ulang konflik jadwal kelas dan reservasi dalam transaksi sebelum menyimpan data ke PostgreSQL.
4. Buka Reservations untuk melihat reservasi. Aktifkan pengingat bila waktu mulai masih lebih dari 30 menit. Batalkan reservasi melalui dialog konfirmasi; ruang kembali tersedia dan pengingat lokal dihapus.
5. Di Search, pilih Scan room QR code. Berikan izin kamera lalu pindai QR berisi `campusspace:room:A-101` (atau `A-101`). Detail ruang A-101 terbuka. QR yang tidak dikenal menampilkan pesan dan tombol untuk memindai ulang. Tombol Cancel scanning kembali ke Search.
6. Simpan ruang dari detail, tambahkan catatan di Saved, lalu buka kembali aplikasi untuk menunjukkan penyimpanan lokal. Matikan jaringan untuk melihat cache ruang dan reservasi beserta penanda data lama. Pencarian ketersediaan dan perubahan reservasi tetap memerlukan API.

## Tiga advanced feature

| Fitur | Implementasi | Manfaat dan penanganan |
| --- | --- | --- |
| Autentikasi | `server/src/auth/`, `mobile/src/app/(auth)/login.tsx`, `mobile/src/providers/auth-provider.tsx`, `mobile/src/storage/session.ts` | Akses reservasi terikat pada akun. Form divalidasi, token JWT disimpan di SecureStore, sesi dipulihkan saat aplikasi dibuka, dan respons 401 mengeluarkan pengguna. Kesalahan masuk ditampilkan di form. |
| Kamera | `mobile/src/app/(app)/scan.tsx`, `mobile/src/features/rooms/scan-code.ts` | QR pada label ruangan membuka detail dengan cepat. Izin diminta saat pengguna membuka pemindai; penolakan menawarkan pengaturan perangkat. Kode tak dikenal, kegagalan kamera, loading data ruang, dan pembatalan ditangani. Pemindaian ini **bukan** check-in reservasi. |
| Notifikasi lokal | `mobile/src/features/reminders/`, `mobile/src/app/(app)/(tabs)/reservations.tsx` | Pengguna dapat meminta pengingat 30 menit sebelum reservasi. Izin diminta saat mengaktifkan, penolakan ditampilkan, dan pengingat bisa dimatikan. Pengingat dibatalkan ketika reservasi dibatalkan atau akun keluar. Ini notifikasi lokal terjadwal di perangkat, bukan push dari server. |

## Pemeriksaan reviewer

- `cd mobile && npm run typecheck && npm run lint && npm test && npx expo export --platform android`
- `cd server && npm run typecheck && npm test && npm run build`
- Uji izin kamera dan notifikasi di perangkat Android. Browser preview tidak menjalankan pengingat lokal; kamera browser memerlukan izin dan konteks aman. Pemindaian QR serta pengiriman notifikasi terjadwal perlu dicek pada perangkat karena tes otomatis memakai mock API perangkat.
- Gunakan QR dengan payload `campusspace:room:A-101` untuk demo. Kode harus cocok dengan `Room.code` yang tersedia dari API/cache; pemindai tidak membuka URL eksternal dari QR.

Commit fitur dibuat terpisah agar riwayat pengerjaan dapat ditinjau per perubahan.
