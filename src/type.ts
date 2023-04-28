import { Result, ok, err, Err, isErr } from './utils.js'

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

type Validator<T> = (value: T)
	=> Result<T, RTError> | Promise<Result<T, RTError>>

export abstract class Type<T> {
	abstract print(): string
	abstract decode(u: unknown, opts: DecoderOpts): Result<T, RTError>
	abstract validate(v: T, opts: DecoderOpts): Promise<Result<T, RTError>>

	validators?: Validator<T>[]

	//addValidator(validator: Validator<T>): Type<T> {
	addValidator(validator: Validator<T>): this {
		//const type = new (this.constructor as { new (): Type<T> })()
		//const type = new (this.constructor as { new (): this })()
		const type: this = new (this.constructor as { new(): Type<T> })() as this
		for (const prop in this) {
			(type as any)[prop] = this[prop]
		}
		type.validators = this.validators ? [...this.validators, validator] : [validator]
		return type
	}

	async validateBase(v: T, opts: DecoderOpts): Promise<Result<T, RTError>> {
		for (const valid of this.validators || []) {
			const res = await valid(v)
			if (isErr(res)) return res
		}
		return ok(v)
	}
}

// Compatibility
export type TypeOf<D> = D extends { decode: (u: unknown, opts: DecoderOpts) => Result<infer T, RTError> } ? T : never
export type RTError = { path: string[], error: string }[]

export function decode<T>(type: Type<T>, value: unknown, opts: DecoderOpts = {}): Result<T, RTError> {
	return type.decode(value, opts)
}

export async function validate<T>(type: Type<T>, value: unknown, opts: DecoderOpts = {}): Promise<Result<T, RTError>> {
	const res = type.decode(value, opts)
	if (isErr(res)) return res
	return type.validate(res.ok, opts)
}

export function decoderError(path: string[], error: string): Err<RTError> {
	return err([{ path, error }])
}

export function error(error: string, path: string[] = []): Err<RTError> {
	return err([{ path, error }])
}

// vim: ts=4
