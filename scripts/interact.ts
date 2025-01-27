import { MessageType } from "@layerzerolabs/lz-solana-sdk-v2";
import { Connection, PublicKey } from "@solana/web3.js";
import { Options } from "@layerzerolabs/lz-v2-utilities";
import { MessagingFee } from "../src/generated/types/MessagingFee";
import { sendAndConfirm } from "./util";
import { connection, signer, counterProgram } from "./common";

(async () => {
  await callIncrement(connection, signer.publicKey, 40161);
})();

async function getCount(connection: Connection) {
  const currentCount = await counterProgram.getCount(connection);

  console.log(`Current count is ${currentCount.count}`);
}

async function getQuote(
  connection: Connection,
  payer: PublicKey,
  dstEid: number,
  options: Uint8Array
): Promise<MessagingFee> {
  const fee = await counterProgram.quote(
    connection,
    payer,
    dstEid,
    MessageType.VANILLA,
    options,
    false
  );

  console.log(fee);
  return fee;
}

async function callIncrement(
  connection: Connection,
  payer: PublicKey,
  dstEid: number
) {
  const options = Options.newOptions()
    .addExecutorLzReceiveOption(50000, 0)
    .toBytes();
  const messagingFee = await getQuote(connection, payer, dstEid, options);
  const ix = await counterProgram.increment(
    connection,
    payer,
    messagingFee,
    null,
    dstEid,
    MessageType.VANILLA,
    options
  );
  await sendAndConfirm(connection, [signer], [ix]);
}
