# Absensi

Aplikasi presensi berbasis Next.js dengan Firebase Authentication (email/password) dan Cloud Firestore.

## Firebase setup

1. Aktifkan penyedia **Email/Password** pada Firebase Authentication.
2. Buat database Cloud Firestore dan deploy `firestore.rules`.
3. Tambahkan akun admin melalui Authentication, lalu buat dokumen `users/{uid}` untuk akun itu dengan `role: "admin"` dan profil yang sesuai.
4. Untuk endpoint admin yang membuat dan menghapus akun Auth, atur kredensial Firebase Admin server-only berdasarkan `.env.example`. Jangan pernah memakai private key service account di variabel `NEXT_PUBLIC_*` atau mengirimkannya ke browser.
5. Akun yang masuk tanpa dokumen profil akan dibuat sebagai `role: "user"` secara otomatis.

Fungsi presensi menyimpan dokumen `attendance/{uid_YYYY-MM-DD}`. Jam dan tanggal dibuat server dalam zona waktu Asia/Jakarta.

## Development

```bash
npm install
npm run dev
```
