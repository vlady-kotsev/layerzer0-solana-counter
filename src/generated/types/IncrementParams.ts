/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as beet from '@metaplex-foundation/beet'
export type IncrementParams = {
  dstEid: number
  msgType: number
  options: Uint8Array
  nativeFee: beet.bignum
  lzTokenFee: beet.bignum
}

/**
 * @category userTypes
 * @category generated
 */
export const incrementParamsBeet =
  new beet.FixableBeetArgsStruct<IncrementParams>(
    [
      ['dstEid', beet.u32],
      ['msgType', beet.u8],
      ['options', beet.bytes],
      ['nativeFee', beet.u64],
      ['lzTokenFee', beet.u64],
    ],
    'IncrementParams'
  )
