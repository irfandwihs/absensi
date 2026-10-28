"use client";

import { useState } from "react";
import { auth, db } from "../lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const profileRef = doc(db, "users", credential.user.uid);
      const profile = await getDoc(profileRef);
      if (!profile.exists()) {
        await setDoc(profileRef, {
          email: credential.user.email || email,
          full_name: credential.user.displayName || email,
          role: "user",
        });
      }
      router.replace(profile.data()?.role === "admin" ? "/admin" : "/");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login gagal.");
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <form onSubmit={handleLogin} className="card p-6 rounded-lg w-80">
        <h1 className="text-xl font-bold mb-4">Login Absensi</h1>
        {error && <p className="text-red-500">{error}</p>}
        <input type="email" placeholder="Email" className="input mb-3" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" className="input mb-3" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn-primary w-full">Login</button>
      </form>
    </div>
  );
}
