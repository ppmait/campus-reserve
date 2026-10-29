import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { error: "กรุณาเข้าสู่ระบบ" },
        {
          status: 401,
          headers: { "Cache-Control": "private, no-store" },
        }
      );
    }

    const { data, error } = await supabase
      .from("bookings")
      .select("id, room_id, booking_date, start_time, end_time")
      .eq("user_id", user.id)
      .order("booking_date")
      .order("start_time");

    if (error) {
      throw error;
    }

    return Response.json(data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("โหลดรายการจองไม่สำเร็จ:", error);

    return Response.json(
      { error: "โหลดรายการจองไม่สำเร็จ" },
      {
        status: 500,
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  }
}
export async function POST(request: Request) {
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  ) {
    return Response.json(
      { error: "ต้องส่งข้อมูลเป็น JSON" },
      { status: 415 }
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { error: "กรุณาเข้าสู่ระบบ" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return Response.json(
        { error: "ข้อมูลการจองไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const { room_id, booking_date, start_time, end_time } = body;
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

    if (
      !Number.isSafeInteger(room_id) ||
      room_id <= 0 ||
      typeof booking_date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(booking_date) ||
      booking_date.startsWith("0000") ||
      !Number.isFinite(Date.parse(`${booking_date}T00:00:00Z`)) ||
      new Date(`${booking_date}T00:00:00Z`)
        .toISOString()
        .slice(0, 10) !== booking_date ||
      typeof start_time !== "string" ||
      !timePattern.test(start_time) ||
      typeof end_time !== "string" ||
      !timePattern.test(end_time) ||
      start_time >= end_time
    ) {
      return Response.json(
        { error: "ตรวจสอบห้อง วันที่ และเวลา โดยเวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("bookings")
      .insert({
        user_id: user.id,
        room_id,
        booking_date,
        start_time,
        end_time,
      })
      .select("id, room_id, booking_date, start_time, end_time")
      .single();

    if (error) {
      if (error.code === "23P01") {
        return Response.json(
          { error: "ห้องนี้มีการจองในช่วงเวลาที่เลือกแล้ว" },
          { status: 409 }
        );
      }

      if (error.code === "23503") {
        return Response.json(
          { error: "ไม่พบห้องหรือบัญชีผู้ใช้ กรุณาโหลดหน้าใหม่" },
          { status: 400 }
        );
      }

      throw error;
    }

    return Response.json(data, { status: 201 });
  } catch (error) {
    console.error("บันทึกการจองไม่สำเร็จ:", error);

    return Response.json(
      { error: "บันทึกการจองไม่สำเร็จ กรุณาลองอีกครั้ง" },
      { status: 500 }
    );
  }
}
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { error: "กรุณาเข้าสู่ระบบ" },
        { status: 401 }
      );
    }

    const id = new URL(request.url).searchParams.get("id");

    if (
      !id ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ) {
      return Response.json(
        { error: "รหัสรายการจองไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return Response.json(
        { error: "ไม่พบรายการจองที่คุณสามารถยกเลิกได้" },
        { status: 404 }
      );
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("ยกเลิกการจองไม่สำเร็จ:", error);

    return Response.json(
      { error: "ยกเลิกการจองไม่สำเร็จ กรุณาลองอีกครั้ง" },
      { status: 500 }
    );
  }
}
