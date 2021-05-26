import { Result, err } from './utils'

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
	abstract decode(u: unknown, opts: DecoderOpts): Result<T>
}

// Compatibility
export type TypeOf<D> = D extends { decode: (u: unknown, opts: DecoderOpts) => Result<infer T> } ? T : never

export function decode<T>(type: Type<T>, value: unknown, opts: DecoderOpts = {}): Result<T> {
	return type.decode(value, opts)
}

// vim: ts=4
