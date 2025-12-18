import { Result, ok, err, Err, isErr, isOk } from './utils.js'

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

	coerceStringToBigInt?: boolean
	coerceNumberToBigInt?: boolean
	coerceBigInt?: boolean

	coerceToArray?: (value: unknown) => unknown

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

	default(value: T | (() => T)): Type<T> {
		return new DefaultType(this, value)
	}

	optional(): OptionalType<T> {
		return new OptionalType(this)
	}

	nullable(): NullableType<T> {
		return new NullableType(this)
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

// Default //
/////////////
export class DefaultType<T> extends Type<T> {
	type: Type<T>
	defaultValue: T | (() => T)

	constructor(type: Type<T>, defaultValue: T | (() => T)) {
		super()
		this.type = type
		this.defaultValue = defaultValue
	}

	private getDefault(): T {
		return typeof this.defaultValue === 'function'
			? (this.defaultValue as () => T)()
			: this.defaultValue
	}

	print() {
		const defVal = typeof this.defaultValue === 'function'
			? '<factory>'
			: JSON.stringify(this.defaultValue)
		return `${this.type.print()} = ${defVal}`
	}

	decode(u: unknown, opts: DecoderOpts): Result<T, RTError> {
		if (u === undefined) return ok(this.getDefault())
		return this.type.decode(u, opts)
	}

	async validate(v: T, opts: DecoderOpts) {
		const res = await this.type.validate(v, opts)
		return isErr(res) ? res : this.validateBase(v, opts)
	}
}

// Optional //
//////////////
export class OptionalType<T> extends Type<T | undefined> {
	type: Type<T>

	constructor(type: Type<T>) {
		super()
		this.type = type
	}

	print() {
		return this.type.print() + ' | undefined'
	}

	decode(u: unknown, opts: DecoderOpts): Result<T | undefined, RTError> {
		if (u === undefined) return ok(undefined)
		const res = this.type.decode(u, opts)
		return isOk(res) ? res : err(res.err)
	}

	async validate(v: T | undefined, opts: DecoderOpts) {
		if (v === undefined) return ok(undefined)
		const res = await this.type.validate(v, opts)
		return isErr(res) ? res : this.validateBase(v, opts)
	}
}

// Nullable //
//////////////
export class NullableType<T> extends Type<T | null | undefined> {
	type: Type<T>

	constructor(type: Type<T>) {
		super()
		this.type = type
	}

	print() {
		return this.type.print()
			+ (isOk(this.type.decode(null, {})) ? '' : ' | null')
			+ (isOk(this.type.decode(undefined, {})) ? '' : ' | undefined')
	}

	decode(u: unknown, opts: DecoderOpts) {
		if (u === null || u === undefined) return ok(u)
		const res = this.type.decode(u, opts)
		return isOk(res) ? res : err(res.err)
	}

	async validate(v: T | null | undefined, opts: DecoderOpts) {
		if (v === null || v === undefined) return ok(v)
		const res = await this.type.validate(v, opts)
		return isErr(res) ? res : this.validateBase(v, opts)
	}
}

// Composable functions //
//////////////////////////
export function withDefault<T>(type: Type<T>, defaultValue: T | (() => T)): DefaultType<T> {
	return new DefaultType(type, defaultValue)
}

export function optional<T>(type: Type<T>): OptionalType<T> {
	return new OptionalType(type)
}

export function nullable<T>(type: Type<T>): NullableType<T> {
	return new NullableType(type)
}

// vim: ts=4
