import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_KEY as string
);
export async function GET() {
  const { data, error } = await supabase
    .from("nft_status")
    .select()
    .eq("available", true);
  if (error) {
    console.error("Error fetching data from Supabase:", error);
    return Response.json({ error: "Error fetching data" }, { status: 500 });
  }

  const token_ids = data?.map((item) => item.token_id);

  return Response.json({ token_ids });
}
