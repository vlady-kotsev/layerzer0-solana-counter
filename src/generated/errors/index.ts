/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

type ErrorWithCode = Error & { code: number }
type MaybeErrorWithCode = ErrorWithCode | null | undefined

const createErrorFromCodeLookup: Map<number, () => ErrorWithCode> = new Map()
const createErrorFromNameLookup: Map<string, () => ErrorWithCode> = new Map()

/**
 * InvalidRemote: ''
 *
 * @category Errors
 * @category generated
 */
export class InvalidRemoteError extends Error {
  readonly code: number = 0x1770
  readonly name: string = 'InvalidRemote'
  constructor() {
    super('')
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, InvalidRemoteError)
    }
  }
}

createErrorFromCodeLookup.set(0x1770, () => new InvalidRemoteError())
createErrorFromNameLookup.set('InvalidRemote', () => new InvalidRemoteError())

/**
 * Attempts to resolve a custom program error from the provided error code.
 * @category Errors
 * @category generated
 */
export function errorFromCode(code: number): MaybeErrorWithCode {
  const createError = createErrorFromCodeLookup.get(code)
  return createError != null ? createError() : null
}

/**
 * Attempts to resolve a custom program error from the provided error name, i.e. 'Unauthorized'.
 * @category Errors
 * @category generated
 */
export function errorFromName(name: string): MaybeErrorWithCode {
  const createError = createErrorFromNameLookup.get(name)
  return createError != null ? createError() : null
}
