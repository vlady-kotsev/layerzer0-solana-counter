import { Connection, Keypair } from "@solana/web3.js";

import {
  ExecutorPDADeriver,
  SetConfigType,
  UlnProgram,
} from "@layerzerolabs/lz-solana-sdk-v2";
import { EndpointId } from "@layerzerolabs/lz-definitions";
import { accounts } from "../src/generated/omnicounter";
import { arrayify, hexZeroPad } from "@ethersproject/bytes";
import { sendAndConfirm } from "./util";
import {
  connection,
  counterProgram,
  endpointProgram,
  executorProgram,
  ulnProgram,
} from "./common";
import { signer } from "./common";
import { remotePeers } from "./common";

(async () => {
  await initCounter(connection, signer, signer);
  for (const [remoteStr, remotePeer] of Object.entries(remotePeers)) {
    const remotePeerBytes = arrayify(hexZeroPad(remotePeer, 32));
    const remote = parseInt(remoteStr) as EndpointId;

    await setPeers(connection, signer, remote, remotePeerBytes);
    await initSendLibrary(connection, signer, remote);
    await setSendLibrary(connection, signer, remote);

    await initReceiveLibrary(connection, signer, remote);
    await setReceiveLibrary(connection, signer, remote);

    await initOappNonce(connection, signer, remote, remotePeerBytes);
    await initUlnConfig(connection, signer, signer, remote);
    await setOappExecutor(connection, signer, remote);
  }

  console.log("Done");
})();

async function initCounter(
  connection: Connection,
  payer: Keypair,
  admin: Keypair
): Promise<void> {
  const [count] = counterProgram.idPDA();
  let current = false;
  try {
    await accounts.Count.fromAccountAddress(connection, count, {
      commitment: "confirmed",
    });
    current = true;
  } catch (e) {
    /*count not init*/
    console.log(e);
  }
  const ix = await counterProgram.initCount(
    connection,
    payer.publicKey,
    admin.publicKey, // admin/delegate double check it, is the same public key
    endpointProgram
  );
  if (ix == null) {
    // already initialized
    return Promise.resolve();
  }
  sendAndConfirm(connection, [admin], [ix]);
}

async function initOappNonce(
  connection: Connection,
  admin: Keypair,
  remote: EndpointId,
  remotePeer: Uint8Array
): Promise<void> {
  const [id] = counterProgram.idPDA();
  const ix = await endpointProgram.initOAppNonce(
    admin.publicKey,
    remote,
    id,
    remotePeer
  );
  if (ix === null) return Promise.resolve();
  const current = false;
  try {
    const nonce = await endpointProgram.getNonce(
      connection as any,
      id,
      remote,
      remotePeer
    );
    if (nonce) {
      console.log("nonce already set");
      return Promise.resolve();
    }
  } catch (e) {
    /*nonce not init*/
  }
  await sendAndConfirm(connection, [admin], [ix]);
}

async function setOappExecutor(
  connection: Connection,
  admin: Keypair,
  remote: EndpointId
): Promise<void> {
  const [id] = counterProgram.idPDA();
  const defaultOutboundMaxMessageSize = 10000;

  const [executorPda] = new ExecutorPDADeriver(executorProgram).config();
  const expected: UlnProgram.types.ExecutorConfig = {
    maxMessageSize: defaultOutboundMaxMessageSize,
    executor: executorPda,
  };

  const current = (
    await ulnProgram.getSendConfigState(connection as any, id, remote)
  )?.executor;

  const ix = await endpointProgram.setOappConfig(
    connection as any,
    admin.publicKey,
    id,
    ulnProgram.program,
    remote,
    {
      configType: SetConfigType.EXECUTOR,
      value: expected,
    }
  );
  if (
    current &&
    current.executor.toBase58() === expected.executor.toBase58() &&
    current.maxMessageSize === expected.maxMessageSize
  ) {
    return Promise.resolve();
  }
  await sendAndConfirm(connection, [admin], [ix]);
}

async function initUlnConfig(
  connection: Connection,
  payer: Keypair,
  admin: Keypair,
  remote: EndpointId
): Promise<void> {
  const [id] = counterProgram.idPDA();

  const current = await ulnProgram.getSendConfigState(
    connection as any,
    id,
    remote
  );
  if (current) {
    return Promise.resolve();
  }
  const ix = await endpointProgram.initOAppConfig(
    admin.publicKey,
    ulnProgram,
    payer.publicKey,
    id,
    remote
  );
  await sendAndConfirm(connection, [admin], [ix]);
}

async function setPeers(
  connection: Connection,
  admin: Keypair,
  remote: EndpointId,
  remotePeer: Uint8Array
): Promise<void> {
  const ix = counterProgram.setRemote(admin.publicKey, remotePeer, remote);
  const [remotePDA] = counterProgram.omniCounterDeriver.remote(remote);
  let current = "";
  try {
    const info = await accounts.Remote.fromAccountAddress(
      connection,
      remotePDA,
      {
        commitment: "confirmed",
      }
    );
    current = Buffer.from(info.address).toString("hex");
  } catch (e) {
    /*remote not init*/
  }
  if (current == Buffer.from(remotePeer).toString("hex")) {
    return Promise.resolve();
  }
  await sendAndConfirm(connection, [admin], [ix]);
}

/*//////////////////////////////////////////////////////////////
                                SEND_LIB
//////////////////////////////////////////////////////////////*/

async function setSendLibrary(
  connection: Connection,
  admin: Keypair,
  remote: EndpointId
): Promise<void> {
  const [id] = counterProgram.idPDA();
  const sendLib = await endpointProgram.getSendLibrary(
    connection as any,
    id,
    remote
  );
  const current = sendLib ? sendLib.msgLib.toBase58() : "";

  const [expectedSendLib] = ulnProgram.deriver.messageLib();

  const expected = expectedSendLib.toBase58();
  if (current === expected) {
    return Promise.resolve();
  }
  const ix = await endpointProgram.setSendLibrary(
    admin.publicKey,
    id,
    ulnProgram.program,
    remote
  );
  await sendAndConfirm(connection, [admin], [ix]);
}

async function initSendLibrary(
  connection: Connection,
  admin: Keypair,
  remote: EndpointId
): Promise<void> {
  const [id] = counterProgram.idPDA();
  const ix = await endpointProgram.initSendLibrary(admin.publicKey, id, remote);
  if (ix == null) {
    return Promise.resolve();
  }
  await sendAndConfirm(connection, [admin], [ix]);
}

/*//////////////////////////////////////////////////////////////
                              RECEIVE_LIB
//////////////////////////////////////////////////////////////*/

async function setReceiveLibrary(
  connection: Connection,
  admin: Keypair,
  remote: EndpointId
): Promise<void> {
  const [id] = counterProgram.idPDA();
  const receiveLib = await endpointProgram.getReceiveLibrary(
    connection as any,
    id,
    remote
  );
  const current = receiveLib ? receiveLib.msgLib.toBase58() : "";
  const [expectedMessageLib] = ulnProgram.deriver.messageLib();
  const expected = expectedMessageLib.toBase58();
  if (current === expected) {
    return Promise.resolve();
  }

  const ix = await endpointProgram.setReceiveLibrary(
    admin.publicKey,
    id,
    ulnProgram.program,
    remote
  );
  await sendAndConfirm(connection, [admin], [ix]);
}

async function initReceiveLibrary(
  connection: Connection,
  admin: Keypair,
  remote: EndpointId
): Promise<void> {
  const [id] = counterProgram.idPDA();
  const ix = await endpointProgram.initReceiveLibrary(
    admin.publicKey,
    id,
    remote
  );
  if (ix == null) {
    return Promise.resolve();
  }
  await sendAndConfirm(connection, [admin], [ix]);
}
