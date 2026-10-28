# Prompt Claude Design — Aplikasi Absensi

Rancang ulang **layout dan sistem visual** untuk aplikasi web absensi yang sudah ada. Buat desain high-fidelity yang dapat diterapkan ke Next.js, dengan semua label dan microcopy dalam Bahasa Indonesia.

## Tujuan produk

Aplikasi dipakai karyawan untuk login, melakukan presensi masuk/pulang, melihat rekap bulanan, melihat profil, dan oleh admin untuk mengelola akun. Halaman utama berada di `/`. Halaman lain: `/login`, `/presensi`, `/rekap`, `/profile`, dan `/admin`.

## Referensi desain dan arah visual

Gunakan Claude Design Artifact ini sebagai referensi komposisi dan gaya: https://claude.ai/artifact/PGee5BPTvrwwpCPraydoA1. Ikuti hierarki, ritme, dan karakter layout artifact setelah isinya tersedia untuk diperiksa. Identitas merek berasal dari logo Bronkis Junior terlampir: kuning cerah (sekitar #FFF200), hitam pekat (#111111), dan putih gading (#FFFBEA). Pakai kuning sebagai aksen dan penanda tindakan, hitam untuk teks utama dan tombol penting, serta bidang putih gading agar antarmuka tetap nyaman dibaca. Jaga kontras teks; jangan meletakkan paragraf hitam kecil di atas latar kuning luas. Buat antarmuka profesional, terpercaya, sederhana, dengan kartu bersih, radius sedang, bayangan tipis, tipografi sans-serif jelas, dan ikon konsisten.

Desain mobile-first untuk layar ponsel, tetapi tetap rapi di tablet dan desktop. Pada ponsel, gunakan lebar konten yang nyaman, tombol besar untuk disentuh, jarak antar elemen yang lega, dan navigasi yang mudah dijangkau. Pastikan fokus keyboard, label form, pesan status, dan kontras warna aksesibel.

## Layar yang harus dirancang

1. **Login (`/login`)** — form email dan kata sandi, tombol masuk, keadaan memuat, dan pesan error Indonesia yang jelas. Tampilkan identitas aplikasi absensi secara sederhana.
2. **Beranda (`/`)** — sapaan pengguna, tanggal dan jam lokal, ringkasan status masuk/pulang hari ini, serta pintasan ke Presensi, Rekap, dan Profil. Sediakan menu yang menampilkan Admin hanya untuk admin.
3. **Presensi (`/presensi`)** — status presensi hari ini, tombol Masuk dan Pulang yang dominan, keadaan saat lokasi sedang diperiksa, izin GPS ditolak, GPS tidak akurat, berhasil, dan di luar area. Jelaskan bahwa presensi hanya bisa dilakukan dalam radius 20 meter dari titik rumah Gatak Krun, Dusun I, Pasung, Kecamatan Wedi, Klaten. Tautkan titik pada peta: https://www.google.com/maps?q=-7.765996,110.5930427. Jangan membuat tombol bypass lokasi.
4. **Rekap (`/rekap`)** — pemilih bulan dan tahun, tabel/list tanggal serta jam masuk/pulang, empty state, dan loading state. Pada layar kecil, tabel boleh berubah menjadi kartu per hari.
5. **Profil (`/profile`)** — nama, email, jabatan, unit kerja, avatar/initials, dan tombol keluar.
6. **Admin (`/admin`)** — alur tambah pengguna dan daftar pengguna, pengeditan, penghapusan dengan konfirmasi, validasi, serta loading/empty/error states. Bedakan role admin dan user secara jelas.

## Perilaku dan batasan

Pertahankan rute dan fungsi yang disebutkan. Ini pekerjaan desain UI; jangan mengubah model autentikasi Firebase, struktur Firestore, aturan geofence, kontrak API, atau perilaku presensi. Jangan menampilkan kata sandi, token, kunci Firebase Admin, atau data sensitif. Jangan menambahkan pendaftaran mandiri atau cara melewati pemeriksaan lokasi.

Berikan komponen reusable untuk header, kartu status, tombol, form, pesan status, tabel, dialog, dan navigasi. Sertakan state normal, loading, error, empty, disabled, dan sukses untuk interaksi utama. Hasil akhir harus konsisten di keenam rute dan mendukung penggunaan satu tangan di ponsel.
