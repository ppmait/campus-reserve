"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        setError("สมัครสมาชิกไม่สำเร็จ: " + error.message);
        return;
      }

      if (data.session) {
        window.location.replace("/");
        return;
      }

      setMessage(
        "ส่งคำขอสมัครแล้ว กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี ก่อนกลับมาเข้าสู่ระบบ"
      );
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <form
        onSubmit={handleSignup}
        className="mx-auto max-w-md space-y-5 rounded-2xl bg-slate-900 p-6"
      >
        <h1 className="text-2xl font-bold">สมัครสมาชิก Campus Reserve</h1>

        <label className="block">
          อีเมล
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-800 p-3"
          />
        </label>

        <label className="block">
          รหัสผ่าน
          <input
            type="password"
            minLength={8}
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-800 p-3"
          />
        </label>

        {error && (
          <p role="alert" className="text-red-400">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="text-emerald-300">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-emerald-400 p-3 font-semibold text-slate-950 hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-50"
        >
          {isSubmitting ? "กำลังสมัคร..." : "สมัครสมาชิก"}
        </button>
      </form>
    </main>
  );
}
