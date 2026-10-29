"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Room = {
  id: number;
  name: string;
  capacity: number;
};

type Booking = {
  id: string;
  room_id: number;
  booking_date: string;
  start_time: string;
  end_time: string;
};

export default function Home() {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isBookingsLoaded, setIsBookingsLoaded] = useState(false);
  const [bookingsError, setBookingsError] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [roomsError, setRoomsError] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const supabase = createClient();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
      setIsLoadingAuth(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoadingAuth) return;

    const controller = new AbortController();

    async function loadBookings() {
      setIsBookingsLoaded(false);
      setBookingsError("");
      setBookings([]);

      try {
        if (!userEmail) return;

        const response = await fetch("/api/bookings", {
          cache: "no-store",
          signal: controller.signal,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error ?? "โหลดรายการจองไม่สำเร็จ");
        }

        if (!controller.signal.aborted) {
          setBookings(result);
        }
      } catch (error) {
        if (controller.signal.aborted) return;

        setBookingsError(
          error instanceof Error ? error.message : "โหลดรายการจองไม่สำเร็จ"
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsBookingsLoaded(true);
        }
      }
    }

    loadBookings();

    return () => controller.abort();
  }, [isLoadingAuth, userEmail]);

  async function handleLogout() {
    if (isSigningOut) return;

    setAuthError("");
    setIsSigningOut(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut({ scope: "local" });

      if (error) {
        setAuthError("ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง");
        return;
      }

      window.location.replace("/login");
    } catch {
      setAuthError("เชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setIsSigningOut(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadRooms() {
      try {
        const response = await fetch("/api/rooms", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("โหลดข้อมูลห้องไม่สำเร็จ");
        }

        const data: Room[] = await response.json();
        setRooms(data);
      } catch (error) {
        if (controller.signal.aborted) return;

        setRoomsError(
          error instanceof Error ? error.message : "เกิดข้อผิดพลาด"
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingRooms(false);
        }
      }
    }

    loadRooms();
    return () => controller.abort();
  }, []);

  async function handleBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRoom || isSubmitting || cancellingId || !isBookingsLoaded) return;

    if (!userEmail) {
      alert("กรุณาเข้าสู่ระบบก่อนจอง");
      return;
    }

    if (startTime >= endTime) {
      alert("เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          room_id: selectedRoom.id,
          booking_date: date,
          start_time: startTime,
          end_time: endTime,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error ?? "บันทึกการจองไม่สำเร็จ");
        return;
      }

      setBookings((previous) => [...previous, result]);
      alert("บันทึกการจองลงฐานข้อมูลแล้ว");
    } catch {
      alert("เชื่อมต่อไม่สำเร็จ กรุณาตรวจรายการจองก่อนลองส่งอีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  }
  async function handleCancel(id: string) {
    if (cancellingId || isSubmitting) return;

    setCancellingId(id);

    try {
      const response = await fetch(
        `/api/bookings?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error ?? "ยกเลิกการจองไม่สำเร็จ");
      }

      setBookings((previous) =>
        previous.filter((booking) => booking.id !== id)
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "ยกเลิกการจองไม่สำเร็จ กรุณารีเฟรชเพื่อตรวจรายการ"
      );
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-center gap-4">
          {isLoadingAuth ? (
            <p role="status">กำลังตรวจสอบสถานะเข้าสู่ระบบ...</p>
          ) : userEmail ? (
            <>
              <p className="text-slate-300">{userEmail}</p>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isSigningOut}
                className="rounded-lg border border-slate-600 px-4 py-2 disabled:opacity-50"
              >
                {isSigningOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
              </button>
            </>
          ) : (
            <Link href="/login" className="text-emerald-300 underline">
              เข้าสู่ระบบ
            </Link>
          )}
        </div>

        {authError && (
          <p role="alert" className="mb-4 text-red-400">
            {authError}
          </p>
        )}
        <p className="text-sm font-semibold text-emerald-400">
          CAMPUS RESERVE
        </p>
        <h1 className="mt-3 text-4xl font-bold">
          พื้นที่ดี ๆ สำหรับทุกไอเดีย
        </h1>
        <p className="mt-4 text-slate-400">
          เลือกห้องที่เหมาะกับคุณ แล้วเริ่มวางแผนการใช้งาน
        </p>

        {isLoadingRooms && (
          <p role="status" className="mt-6 text-slate-400">
            กำลังโหลดห้อง...
          </p>
        )}

        {roomsError && (
          <p role="alert" className="mt-6 text-red-400">
            {roomsError}
          </p>
        )}

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {rooms.map((room) => (
            <article
              key={room.id}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
            >
              <h2 className="text-xl font-semibold">{room.name}</h2>
              <p className="mt-2 text-slate-400">
                รองรับ {room.capacity} คน
              </p>
              <button
                onClick={() => setSelectedRoom(room)}
                className="mt-6 w-full rounded-lg bg-emerald-400 px-4 py-3 font-semibold text-slate-950 hover:bg-emerald-300"
              >
                เลือกห้องนี้
              </button>
            </article>
          ))}
        </div>

        <p role="status" className="mt-8 text-emerald-300">
          {selectedRoom
            ? `คุณเลือก ${selectedRoom.name} — ขั้นต่อไปคือเลือกวันและเวลา`
            : "ยังไม่ได้เลือกห้อง"}
        </p>

        {selectedRoom && (
          <form
            className="mt-6 max-w-lg space-y-4 rounded-2xl bg-slate-900 p-6"
            onSubmit={handleBooking}
          >
            <h2 className="text-xl font-semibold">เลือกวันและเวลา</h2>

            <label className="block">
              วันที่ใช้งาน
              <input
                type="date"
                required
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-800 p-3"
              />
            </label>

            <label className="block">
              เวลาเริ่ม
              <input
                type="time"
                required
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-800 p-3"
              />
            </label>

            <label className="block">
              เวลาสิ้นสุด
              <input
                type="time"
                required
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-800 p-3"
              />
            </label>

            <button
              type="submit"
              disabled={
                !isBookingsLoaded ||
                isLoadingAuth ||
                !userEmail ||
                isSubmitting ||
                cancellingId !== null
              }
              className="w-full rounded-lg bg-emerald-400 p-3 font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-50"
            >
              ตรวจสอบรายการ
            </button>
          </form>
        )}

        <section className="mt-10">
          <h2 className="text-2xl font-bold">รายการจองของฉัน</h2>

          {isLoadingAuth || !isBookingsLoaded ? (
            <p role="status" className="mt-4 text-slate-400">
              กำลังโหลดรายการจอง...
            </p>
          ) : !userEmail ? (
            <p className="mt-4 text-slate-400">กรุณาเข้าสู่ระบบเพื่อดูรายการจอง</p>
          ) : bookingsError ? (
            <p role="alert" className="mt-4 text-red-400">{bookingsError}</p>
          ) : bookings.length === 0 ? (
            <p className="mt-4 text-slate-400">ยังไม่มีรายการจอง</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {bookings.map((booking) => (
                <li
                  key={booking.id}
                  className="rounded-xl border border-slate-700 bg-slate-900 p-4"
                >
                  <h3 className="font-semibold">
                    {rooms.find((room) => room.id === booking.room_id)?.name ??
                      `ห้องหมายเลข ${booking.room_id}`}
                  </h3>
                  <p className="mt-2 text-slate-300">
                    {booking.booking_date} · {booking.start_time.slice(0, 5)}
                    –{booking.end_time.slice(0, 5)}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleCancel(booking.id)}
                    disabled={cancellingId !== null || isSubmitting}
                    className="mt-3 rounded-lg border border-red-400 px-4 py-2 text-sm text-red-300 hover:bg-red-400/10"
                  >
                    ยกเลิกการจอง
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
