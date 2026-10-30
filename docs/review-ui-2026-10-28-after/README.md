# Review UI CampusSpace — 28 Oktober 2026

Reviewer menjalankan preview web Expo dengan API NestJS dan PostgreSQL lokal berisi data demo. Ukuran yang diperiksa: desktop 1280 × 800, ponsel 390 × 844, dan viewport ponsel 390 × 500 untuk simulasi area yang tersisa saat keyboard muncul.

| Kriteria | Hasil review saat program berjalan |
| --- | --- |
| Layout adaptif | Login tetap terpusat dan dibatasi lebarnya di desktop; layout ponsel tidak melampaui lebar viewport. Daftar ruang juga dibatasi lebarnya di desktop. |
| Keyboard-safe UI | Input password yang sedang fokus tetap terlihat pada viewport 390 × 500 (posisi bawah input 379 px). Halaman memakai area scroll dan pengaturan keyboard Android `resize`; tab bawah disembunyikan saat keyboard tampil. Keyboard Android asli masih perlu diperiksa di emulator atau perangkat. |
| Accessibility dasar | Input dan tombol memiliki nama yang terbaca pada pohon aksesibilitas. Error password ditandai invalid dan terhubung ke pesan melalui `aria-describedby`; kontras warna teks error dan peringatan ditingkatkan. |
| Feedback aksi | Tombol menampilkan teks proses saat login/pencarian. Validasi memberi pesan langsung; pencarian selesai dengan judul **Available rooms**, jumlah hasil, dan kartu ruang. |

## Empat screenshot

1. [Login desktop](01-login-desktop.jpg) — 1280 × 800.
2. [Login ponsel](02-login-mobile.jpg) — 390 × 844. Gambar ini berasal dari review awal; layout ponsel tidak berubah pada perbaikan.
3. [Input terlihat saat viewport menyusut](03-keyboard-viewport.jpg) — 390 × 500, input password fokus.
4. [Hasil aksi pencarian](04-search-results.jpg) — 390 × 844, enam ruang tersedia dari API lokal.

Pemeriksaan tambahan: `npm run typecheck`, `npm run lint`, dan `npm test` pada `mobile/`. Preview browser memverifikasi UI web; perilaku keyboard fisik dan pembaca layar Android belum dapat dinyatakan teruji tanpa perangkat atau emulator.
