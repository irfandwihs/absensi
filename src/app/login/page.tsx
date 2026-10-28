"use client";

import { useState } from "react";
import { FirebaseError } from "firebase/app";
import { auth, db } from "../lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { FiClock, FiLoader } from "react-icons/fi";
import { FormField, FieldInput, StatusMessage } from "../components/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const profileRef = doc(db, "users", credential.user.uid);
      const profile = await getDoc(profileRef);
      if (!profile.exists()) {
        await setDoc(profileRef, {
          email: credential.user.email || email.trim(),
          full_name: credential.user.displayName || email.trim(),
          role: "user",
        });
      }
      router.replace(profile.data()?.role === "admin" ? "/admin" : "/");
    } catch (loginError) {
      if (loginError instanceof FirebaseError && loginError.code === "permission-denied") {
        setError("Login berhasil, tetapi Firestore menolak akses profil. Pastikan database Firestore sudah dibuat dan file firestore.rules sudah diterapkan di Firebase Console.");
      } else if (loginError instanceof FirebaseError && loginError.code === "auth/invalid-credential") {
        setError("Email atau kata sandi salah. Periksa lagi lalu coba kembali.");
      } else if (loginError instanceof FirebaseError && loginError.code === "auth/operation-not-allowed") {
        setError("Login Email/Password belum diaktifkan di Firebase Authentication.");
      } else {
        setError(loginError instanceof Error ? loginError.message : "Login gagal.");
      }
    } finally {
      setLoading(false);
    }
  };

  const invalidEmail = error.startsWith("Email atau kata sandi salah");
  return (
    <div className="login-page">
      <div className="login-brand">
        <span className="login-mark" aria-hidden="true"><FiClock /></span>
        <h1>Masuk ke Absensi</h1>
        <p className="body-secondary">Gunakan akun yang diberikan oleh admin.</p>
      </div>
      <form onSubmit={handleLogin} className="ui-card login-card">
        {error && <StatusMessage variant="error">{error}</StatusMessage>}
        <FormField label="Email" htmlFor="email" error={invalidEmail ? "Periksa kembali alamat email Anda." : undefined}>
          <FieldInput id="email" type="email" autoComplete="username" required placeholder="nama@perusahaan.id" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={invalidEmail || undefined} aria-describedby={invalidEmail ? "email-error" : undefined} />
        </FormField>
        <FormField label="Kata sandi" htmlFor="password">
          <FieldInput id="password" type="password" autoComplete="current-password" required placeholder="Masukkan kata sandi" value={password} onChange={(event) => setPassword(event.target.value)} />
        </FormField>
        <button className="ui-button button-primary full-width" disabled={loading}>{loading ? <><FiLoader className="spin-icon" aria-hidden="true" /> Memproses…</> : "Masuk"}</button>
      </form>
      <p className="login-footer">Belum punya akun? <strong>Hubungi admin.</strong></p>
    </div>
  );
}
