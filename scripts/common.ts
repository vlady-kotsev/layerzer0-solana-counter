import { EndpointProgram, UlnProgram } from "@layerzerolabs/lz-solana-sdk-v2";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { OmniCounter } from "../src/generated/omnicounter";
import { EndpointId } from "@layerzerolabs/lz-definitions";

const endpointProgram = new EndpointProgram.Endpoint(
    new PublicKey("76y77prsiCMvXMjuoZ5VRrhG5qYBrUMYTE5WgHqgjEn6")
  ); // endpoint program id, mainnet and testnet are the same
  const ulnProgram = new UlnProgram.Uln(
    new PublicKey("7a4WjyR8VZ7yZz5XJAKm39BUGn5iT9CKcv2pmG9tdXVH")
  ); // uln program id, mainnet and testnet are the same
  const executorProgram = new PublicKey(
    "6doghB248px58JSSwG4qejQ46kFMW4AMj7vzJnWZHNZn"
  ); // executor program id, mainnet and testnet are the same
  
  const counterProgram = new OmniCounter(
    new PublicKey("4JSbnmWnAmRfaCWeZwFHWJrakYgrqtkXRqZ6MN4o9KiE")
  );
  
  const connection = new Connection("https://api.devnet.solana.com");
  
  const signer = Keypair.fromSecretKey(
    new Uint8Array([
      239, 59, 47, 115, 199, 2, 168, 51, 43, 205, 152, 119, 158, 25, 243, 254,
      241, 224, 82, 56, 71, 214, 25, 169, 23, 130, 66, 249, 233, 247, 123, 166,
      72, 82, 87, 43, 126, 83, 99, 181, 180, 246, 125, 162, 205, 159, 126, 47, 44,
      149, 15, 136, 204, 64, 79, 252, 107, 198, 74, 129, 153, 196, 96, 12,
    ])
  );
  const remotePeers: { [key in EndpointId]?: string } = {
    [EndpointId.SEPOLIA_V2_TESTNET]: "0xd6B608485dB278c793CaDa87Cc92Ab14D232e121", // EVM counter addr
  };

  export {endpointProgram, ulnProgram, executorProgram, counterProgram, connection, signer, remotePeers};