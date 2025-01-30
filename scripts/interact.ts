import { MessageType } from "@layerzerolabs/lz-solana-sdk-v2";
import { Connection, PublicKey } from "@solana/web3.js";
import { Options } from "@layerzerolabs/lz-v2-utilities";
import { MessagingFee } from "../src/generated/types/MessagingFee";
import { sendAndConfirm } from "./util";
import { connection, signer, counterProgram } from "./common";
import { EndpointId } from "@layerzerolabs/lz-definitions";
import { accounts } from "../src/generated/omnicounter";

(async () => {
  //await callIncrement(connection, signer.publicKey, 40267);
  // generateOptions();
  // await getId(connection);
  //await getPeer(connection, 40267);
  await getCount(connection);
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
    .addExecutorLzReceiveOption(300000, 0)
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

async function getPeer(
  connection: Connection,
  remote: EndpointId
): Promise<void> {
  const [remotePDA] = counterProgram.omniCounterDeriver.remote(remote);
  try {
    const info = await accounts.Remote.fromAccountAddress(
      connection,
      remotePDA,
      {
        commitment: "confirmed",
      }
    );
    const peer = "0x" + Buffer.from(info.address).toString("hex");
    console.log(peer);
  } catch (e) {
    // remote not initialized
    console.log(e);
  }
}

async function getSendLib(
  connection: Connection,
  payer: PublicKey,
  destId: number
) {
  const sendLib = await counterProgram.getSendLibraryProgram(
    connection,
    payer,
    destId
  );
  console.log(`sendLib: ${sendLib.program}`);
}

async function getId(connection: Connection) {
  const [id] = counterProgram.idPDA();
  console.log(id);
}

function generateOptions() {
  const options = Options.newOptions()
    .addExecutorLzReceiveOption(300000, 0)
    .toHex();
  console.log(options);
}
