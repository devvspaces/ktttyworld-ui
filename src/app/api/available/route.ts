import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_KEY as string
);
export async function GET() {
  const BATCH = 1000;
  const allRows: { token_id: number }[] = [];
  for (let from = 0; ; from += BATCH) {
    const to = from + BATCH - 1;
    const { data, error } = await supabase
      .from("nft_status")
      .select("token_id")
      .eq("available", true)
      .range(from, to);
    if (error) throw error;
    allRows.push(...data!);
    // once you get fewer than BATCH, you’re done
    if (data!.length < BATCH) break;
  }
  // const totalNfts = await supabase
  //   .from("nft_status")
  //   .select("token_id", { count: "exact" })

  const amountMinted = 6666 - allRows.length;
  console.log("Amount minted:", amountMinted);

  // 2. Extract just the IDs
  const token_ids = allRows.map((r) => r.token_id);
  console.log("Total fetched:", token_ids.length);

  return Response.json({ token_ids, amountMinted });
}
