import { ethers } from "ethers";
import phaseAddresses from "@/lib/phase.json";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phase = searchParams.get("phase");
  const address = searchParams.get("address");
  if (!phase) {
    return Response.json({ error: "Phase is required" }, { status: 400 });
  }
  if (!address) {
    return Response.json({ error: "Address is required" }, { status: 400 });
  }
  const addrs = phaseAddresses[phase as keyof typeof phaseAddresses];

  // 1) Compute Merkle tree
  const leaves = addrs.map((addr) =>
    // hash as bytes32
    Buffer.from(ethers.keccak256(ethers.getBytes(addr)).slice(2), "hex")
  );
  const tree = new MerkleTree(leaves, keccak256, { sort: true });
  const root = tree.getHexRoot();

  console.log(`Phase ${phase} Merkle Root:`, root);

  const proof = tree.getHexProof(keccak256(address));

  return Response.json({
    message: "Proof generated",
    proof,
  });
}
