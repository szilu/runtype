import { Result, Err, err } from './utils'

//////////
// Type //
//////////
export interface DecoderOpts {
	coerceNumberToString?: boolean
	coerceNumberToBoolean?: boolean
	coerceStringToNumber?: boolean
	coerceScalar?: boolean

	coerceStringToDate?: boolean
	coerceNumberToDate?: boolean
	coerceDate?: boolean

	coerceAll?: boolean

	acceptNaN?: boolean

	unknownFields?: 'reject' | 'drop' | 'discard'
}

export abstract class Type<T> {
	abstract print(): string
	abstract decode(u: unknown, opts: DecoderOpts): Result<T, DecoderError>
}

// Compatibility
export type TypeOf<D> = D extends { decode: (u: unknown, opts: DecoderOpts) => Result<infer T, DecoderError> } ? T : never
export type DecoderError = { path: string[], error: string }[]

export function decode<T>(type: Type<T>, value: unknown, opts: DecoderOpts = {}): Result<T, DecoderError> {
	return type.decode(value, opts)
}

export function decoderError(path: string[], error: string): Err<DecoderError> {
	return err([{ path, error }])
}

// vim: ts=4
