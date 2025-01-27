import { buildVersionedTransaction } from "@layerzerolabs/lz-solana-sdk-v2";
import { Connection, Signer, TransactionInstruction } from "@solana/web3.js";

export async function sendAndConfirm(
  connection: Connection,
  signers: Signer[],
  instructions: TransactionInstruction[]
): Promise<void> {
  const tx = await buildVersionedTransaction(
    connection as any,
    signers[0].publicKey,
    instructions,
    "confirmed"
  );
  tx.sign(signers);
  const hash = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: true,
  });
  console.log(`Tx hash: ${hash}`);
  await connection.confirmTransaction(hash, "confirmed");
}
