import { ethers } from "ethers";
import { abi } from "@/lib/abi.json";
import { createClient } from "@supabase/supabase-js";

const NFT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as string;
const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_KEY as string
);
const provider = new ethers.JsonRpcProvider(
  process.env.NEXT_PUBLIC_RPC_URL as string
);
const contract = new ethers.Contract(NFT_CONTRACT_ADDRESS, abi, provider);

export async function POST(request: Request) {
  const res = await request.json();

  const token_id = parseInt(res.token_id, 10);
  console.log("TOKEN ID", token_id);
  if (!token_id) {
    return Response.json({ error: "Token ID is required" }, { status: 400 });
  }

  const isAvailable = await contract.availableTokens(token_id);
  const owner = await contract.ownerOf(token_id);

  console.log("OWNER", owner);
  console.log("IS AVAILABLE", isAvailable);

  if (owner !== NFT_CONTRACT_ADDRESS && !isAvailable) {
    const { error } = await supabase
      .from("nft_status")
      .update({
        available: false,
      })
      .eq("token_id", token_id);
    if (error) {
      console.error("Error updating data to Supabase:", error);
      return;
    }
    return Response.json({
      message: "NFT updated and is not available anymore",
    });
  }

  return Response.json({
    message: "NFT is available",
  });
}
