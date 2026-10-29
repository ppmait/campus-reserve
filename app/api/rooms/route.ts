import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return Response.json(
      { error: "ยังไม่ได้ตั้งค่าการเชื่อมต่อฐานข้อมูล" },
      { status: 500 }
    );
  }

  try {
    const supabase = createClient(url, key);

    const { data, error } = await supabase
      .from("rooms")
      .select("id, name, capacity")
      .order("id");

    if (error) {
      throw error;
    }

    return Response.json(data);
  } catch (error) {
    console.error("โหลดห้องไม่สำเร็จ:", error);

    return Response.json(
      { error: "โหลดข้อมูลห้องไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
