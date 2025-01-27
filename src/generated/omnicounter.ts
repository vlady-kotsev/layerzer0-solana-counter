import {
  EndpointProgram,
  EventPDADeriver,
  MessageType,
  SimpleMessageLibProgram,
  UlnProgram,
} from "@layerzerolabs/lz-solana-sdk-v2";
import { OmniCounterPDADeriver } from "./pda-deriver";
import {
  Commitment,
  Connection,
  PublicKey,
  GetAccountInfoConfig,
  TransactionInstruction,
  ComputeBudgetProgram,
  VersionedTransaction,
  TransactionMessage,
  AccountMeta,
} from "@solana/web3.js";
import * as instructions from "./instructions";
import * as types from "./types";
import * as accounts from "./accounts";
import { hexlify } from "@ethersproject/bytes";
import { PacketPath } from "@layerzerolabs/lz-v2-utilities";

export { instructions, types, accounts };

export class OmniCounter {
  omniCounterDeriver: OmniCounterPDADeriver;
  endpoint: EndpointProgram.Endpoint | undefined;

  constructor(public readonly program: PublicKey, public counterId = 0) {
    this.omniCounterDeriver = new OmniCounterPDADeriver(program, counterId);
  }

  idPDA(): [PublicKey, number] {
    return this.omniCounterDeriver.count();
  }

  async initCount(
    connection: Connection,
    payer: PublicKey,
    admin: PublicKey,
    endpoint: EndpointProgram.Endpoint,
    commitmentOrConfig: Commitment | GetAccountInfoConfig = "confirmed"
  ) {
    const [id] = this.idPDA();
    const [oAppRegistry] = endpoint.deriver.oappRegistry(id);
    const info = await connection.getAccountInfo(id, commitmentOrConfig);
    if (info) {
      // no need to init
      return null;
    }
    const [eventAuthority] = new EventPDADeriver(
      endpoint.program
    ).eventAuthority();

    const ixAccounts =
      EndpointProgram.instructions.createRegisterOappInstructionAccounts(
        {
          payer: payer,
          oapp: id,
          oappRegistry: oAppRegistry,
          eventAuthority,
          program: endpoint.program,
        },
        endpoint.program
      );
    // these accounts are used for the CPI, so we need to set them to false
    const registerOAppAccounts = [
      {
        pubkey: endpoint.program,
        isSigner: false,
        isWritable: false,
      },
      ...ixAccounts,
    ];
    // the first two accounts are both signers, so we need to set them to false, solana will set them to signer internally
    registerOAppAccounts[1].isSigner = false;
    registerOAppAccounts[2].isSigner = false;
    return instructions.createInitCountInstruction(
      {
        payer,
        count: id,
        lzReceiveTypesAccounts:
          this.omniCounterDeriver.lzReceiveTypesAccounts()[0],
        anchorRemainingAccounts: registerOAppAccounts,
      } satisfies instructions.InitCountInstructionAccounts,
      {
        params: {
          endpoint: endpoint.program,
          id: this.counterId,
          admin,
        } satisfies types.InitCountParams,
      } satisfies instructions.InitCountInstructionArgs,
      this.program
    );
  }

  async getCount(
    connection: Connection,
    commitmentOrConfig: Commitment | GetAccountInfoConfig = "confirmed"
  ): Promise<accounts.Count | null> {
    const [countPDA] = this.idPDA();
    const info = await connection.getAccountInfo(countPDA, commitmentOrConfig);
    if (info) {
      const [count] = accounts.Count.fromAccountInfo(info, 0);
      return count;
    }
    return null;
  }

  setRemote(
    admin: PublicKey,
    dstAddress: Uint8Array,
    dstEid: number
  ): TransactionInstruction {
    const [remotePDA] = this.omniCounterDeriver.remote(dstEid);
    return instructions.createSetRemoteInstruction(
      {
        admin,
        count: this.idPDA()[0],
        remote: remotePDA,
      } satisfies instructions.SetRemoteInstructionAccounts,
      {
        params: {
          id: this.counterId,
          dstEid,
          remote: Array.from(dstAddress),
        } satisfies types.SetRemoteParams,
      },
      this.program
    );
  }

  async getRemote(
    connection: Connection,
    dstEid: number,
    commitmentOrConfig?: Commitment | GetAccountInfoConfig
  ): Promise<Uint8Array | null> {
    const [remotePDA] = this.omniCounterDeriver.remote(dstEid);
    const info = await connection.getAccountInfo(remotePDA, commitmentOrConfig);
    if (info) {
      const remote = await accounts.Remote.fromAccountAddress(
        connection,
        remotePDA,
        commitmentOrConfig
      );
      return Uint8Array.from(remote.address);
    }
    return null;
  }

  async getEndpoint(connection: Connection): Promise<EndpointProgram.Endpoint> {
    if (this.endpoint) {
      return this.endpoint;
    }
    const [id] = this.omniCounterDeriver.count();
    const info = await accounts.Count.fromAccountAddress(connection, id);
    const programAddr = info.endpointProgram;
    const endpoint = new EndpointProgram.Endpoint(programAddr);
    this.endpoint = endpoint;
    return endpoint;
  }

  async getSendLibraryProgram(
    connection: Connection,
    payer: PublicKey,
    dstEid: number,
    endpoint?: EndpointProgram.Endpoint
  ): Promise<SimpleMessageLibProgram.SimpleMessageLib | UlnProgram.Uln> {
    if (!endpoint) {
      endpoint = await this.getEndpoint(connection);
    }
    const [id] = this.idPDA();
    const sendLibInfo = await endpoint.getSendLibrary(
      connection as any,
      id,
      dstEid
    );
    if (!sendLibInfo?.programId) {
      throw new Error(
        "Send library not initialized or blocked message library"
      );
    }
    const { programId: msgLibProgram } = sendLibInfo;
    const msgLibVersion = await endpoint.getMessageLibVersion(
      connection as any,
      payer,
      msgLibProgram
    );
    if (
      msgLibVersion?.major.toString() === "0" &&
      msgLibVersion.minor == 0 &&
      msgLibVersion.endpointVersion == 2
    ) {
      return new SimpleMessageLibProgram.SimpleMessageLib(msgLibProgram);
    } else if (
      msgLibVersion?.major.toString() === "3" &&
      msgLibVersion.minor == 0 &&
      msgLibVersion.endpointVersion == 2
    ) {
      return new UlnProgram.Uln(msgLibProgram);
    }

    throw new Error(
      `Unsupported message library version: ${JSON.stringify(
        msgLibVersion,
        null,
        2
      )}`
    );
  }

  async quote(
    connection: Connection,
    payer: PublicKey,
    dstEid: number,
    msgType: MessageType | number,
    options: Uint8Array,
    payInLzToken: boolean,
    remainingAccounts?: AccountMeta[],
    commitmentOrConfig: Commitment | GetAccountInfoConfig = "confirmed"
  ): Promise<EndpointProgram.types.MessagingFee> {
    const endpoint = await this.getEndpoint(connection);
    const [id] = this.idPDA();
    const msgLibProgram = await this.getSendLibraryProgram(
      connection,
      payer,
      dstEid,
      endpoint
    );
    const [remotePDA] = this.omniCounterDeriver.remote(dstEid);
    const [endpointSettingPDA] = endpoint.deriver.setting();
    const receiverInfo = await accounts.Remote.fromAccountAddress(
      connection,
      remotePDA,
      commitmentOrConfig
    );
    const packetPath: PacketPath = {
      srcEid: 0,
      dstEid,
      sender: hexlify(id.toBytes()),
      receiver: hexlify(receiverInfo.address),
    };
    const ix = instructions.createQuoteInstruction(
      {
        count: id,
        endpoint: endpointSettingPDA,
        // Get remaining accounts from msgLib(simple_msgLib or uln)
        anchorRemainingAccounts:
          remainingAccounts ??
          (await endpoint.getQuoteIXAccountMetaForCPI(
            connection as any,
            payer,
            packetPath,
            msgLibProgram
          )),
      } satisfies instructions.QuoteInstructionAccounts,
      {
        params: {
          dstEid: dstEid,
          msgType: msgType,
          options,
          receiver: receiverInfo.address,
          payInLzToken,
        } satisfies types.QuoteParams,
      } satisfies instructions.QuoteInstructionArgs,
      this.program
    );

    //TODO: get compute units: const units = await getSimulationComputeUnits(this.connection, [ix], walletPk, [])
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: 1000000,
    });

    const tx = new VersionedTransaction(
      new TransactionMessage({
        instructions: [modifyComputeUnits, ix],
        payerKey: payer,
        recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
      }).compileToV0Message()
    );
    const simulateResp = await connection.simulateTransaction(tx, {
      sigVerify: false,
      commitment: "confirmed",
    });
    const returnPrefix = `Program return: ${this.program.toBase58()} `;
    const returnLog = simulateResp.value.logs?.find((l) =>
      l.startsWith(returnPrefix)
    );
    if (returnLog === undefined) {
      console.error("error logs", simulateResp.value.logs);
      throw new Error("View expected return log");
    } else {
      const buffer = Buffer.from(
        returnLog.slice(returnPrefix.length),
        "base64"
      );
      const fee = EndpointProgram.types.messagingFeeBeet.read(buffer, 0);
      return fee;
    }
  }

  async increment(
    connection: Connection,
    payer: PublicKey,
    fee: EndpointProgram.types.MessagingFee,
    mint: PublicKey | null, // Token mint account
    dstEid: number,
    msgType: MessageType | number,
    options: Uint8Array,
    remainingAccounts?: AccountMeta[],
    commitmentOrConfig: Commitment | GetAccountInfoConfig = "confirmed"
  ): Promise<TransactionInstruction> {
    const endpoint = await this.getEndpoint(connection);
    const msgLibProgram = await this.getSendLibraryProgram(
      connection,
      payer,
      dstEid,
      endpoint
    );
    const [countPDA] = this.omniCounterDeriver.count();
    const [remotePDA] = this.omniCounterDeriver.remote(dstEid);
    const [endpointSettingPDA] = endpoint.deriver.setting();
    const receiverInfo = await accounts.Remote.fromAccountAddress(
      connection,
      remotePDA,
      commitmentOrConfig
    );
    const packetPath: PacketPath = {
      srcEid: 0,
      dstEid,
      sender: hexlify(countPDA.toBytes()),
      receiver: hexlify(receiverInfo.address),
    };
    const ix = instructions.createIncrementInstruction(
      {
        remote: remotePDA,
        count: countPDA,
        endpoint: endpointSettingPDA,
        // Get remaining accounts from msgLib(simple_msgLib or uln)
        anchorRemainingAccounts:
          remainingAccounts ??
          (await endpoint.getSendIXAccountMetaForCPI(
            connection as any,
            payer,
            packetPath,
            msgLibProgram,
            commitmentOrConfig
          )),
      } satisfies instructions.IncrementInstructionAccounts,
      {
        params: {
          dstEid: dstEid,
          msgType: msgType,
          nativeFee: fee.nativeFee,
          lzTokenFee: fee.lzTokenFee,
          options,
        } satisfies types.IncrementParams,
      } satisfies instructions.IncrementInstructionArgs,
      this.program
    );
    // const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
    //   units: 1000000,
    // });

    // const tx = new VersionedTransaction(
    //   new TransactionMessage({
    //     instructions: [modifyComputeUnits, ix],
    //     payerKey: payer,
    //     recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    //   }).compileToV0Message()
    // );
    return ix;
  }
}
