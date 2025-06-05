import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_KEY as string
);
export async function GET() {
  const available = await supabase
    .from("nft_status")
    .select("token_id", { count: "exact" })
    .eq("available", true)

  const amountMinted = 6666 - (available?.count ?? 0);
  console.log("Amount minted:", amountMinted);
  return Response.json({ amountMinted });
}
