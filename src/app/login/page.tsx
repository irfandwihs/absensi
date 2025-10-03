"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setError(error.message);
    else {
      // check role in users table to redirect admins to /admin
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from("users")
            .select("role")
            .eq("email", user.email)
            .single();
          const role = data?.role || "user";
          if (role === "admin") router.push("/admin");
          else router.push("/dashboard");
        } else {
          router.push("/dashboard");
        }
      } catch {
        router.push("/dashboard");
      }
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
