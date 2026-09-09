import { type Err, err, isErr, isOk, ok, type Result } from './utils.js'

//////////
// Type //
//////////
// What a decode() actually reads. Threaded down through every composite type.
export interface DecodeContext {
	// Coercion slots. Only consulted for a value that is not already of the target type.
	coerceToString?: Coercer<string>
	coerceToNumber?: Coercer<number>
	coerceToBoolean?: Coercer<boolean>
	coerceToDate?: Coercer<Date>
	coerceToBigInt?: Coercer<bigint>
	coerceToArray?: (value: unknown) => unknown

	acceptNaN?: boolean

	unknownFields?: 'reject' | 'drop' | 'discard'
}

// What T.decode()/T.validate()/T.validateSync() accept: the above, plus the boolean flags
// selecting a built-in coercion rule. The flags are resolved into slots by resolveContext()
// before anything below the entry point sees them, and an explicitly supplied slot wins.
export interface DecoderOpts extends DecodeContext {
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
}

// A coercer turns a value of some other type into the target type, or reports its own error.
export type Coercer<T> = (value: unknown) => Result<T, RTError>

export type Validator<T> = (value: T) => Result<T, RTError>
export type AsyncValidator<T> = (value: T) => Result<T, RTError> | Promise<Result<T, RTError>>

// NOTE: Object.create() skips the constructor, so any future ES #private field
// on a Type subclass would not be copied. TS-private fields (StructType._keys,
// _keySet) are ordinary own enumerable props and copy fine.
// biome-ignore lint/suspicious/noExplicitAny: Type<any> is the only bound every Type instance satisfies
function cloneType<T extends Type<any>>(type: T): T {
	const copy: T = Object.create(Object.getPrototypeOf(type))
	for (const prop in type) {
		;(copy as Record<string, unknown>)[prop] = (type as Record<string, unknown>)[prop]
	}
	return copy
}

// A validator is user code. It may be written against a shape a derived type no longer has
// (deepPartial() makes fields absent) and throw. decode()/validate()/validateSync() all
// promise a Result, so a throw is reported as an error rather than escaping.
function validatorThrew(e: unknown): Err<RTError> {
	return error(`validator threw: ${e instanceof Error ? e.message : String(e)}`)
}

// Same contract for the coercion hooks: user code, so a throw becomes an error. Off the hot
// path - every scalar decode() returns on an exact type match before reaching this, so it is
// entered only for a value that actually needs coercing.
export function runCoercer<T>(coercer: Coercer<T>, u: unknown): Result<T, RTError> {
	try {
		return coercer(u)
	} catch (e) {
		return error(`coercer threw: ${e instanceof Error ? e.message : String(e)}`)
	}
}

export abstract class Type<T> {
	abstract print(): string
	abstract decode(u: unknown, opts: DecodeContext): Result<T, RTError>
	abstract validate(v: T, opts: DecodeContext): Promise<Result<T, RTError>>
	abstract validateSync(v: T, opts: DecodeContext): Result<T, RTError>

	validators?: Validator<T>[]
	asyncValidators?: AsyncValidator<T>[]

	addValidator(validator: Validator<T>): this {
		const type = cloneType(this)
		type.validators = this.validators ? [...this.validators, validator] : [validator]
		return type
	}

	addAsyncValidator(validator: AsyncValidator<T>): this {
		const type = cloneType(this)
		type.asyncValidators = this.asyncValidators
			? [...this.asyncValidators, validator]
			: [validator]
		return type
	}

	async validateBase(v: T, _opts: DecodeContext): Promise<Result<T, RTError>> {
		try {
			for (const valid of this.validators || []) {
				const res = valid(v)
				if (isErr(res)) return res
			}
			for (const valid of this.asyncValidators || []) {
				const res = await valid(v)
				if (isErr(res)) return res
			}
		} catch (e) {
			// A misuse of validateSync() is a programming error wherever it surfaces from -
			// do not launder it into a validation failure.
			if (e instanceof AsyncValidatorError) throw e
			return validatorThrew(e)
		}
		return ok(v)
	}

	// Fails fast: calling validateSync() on a type with async validators is a programming
	// error, and a field error must not mask it.
	protected checkSync(): void {
		if (this.asyncValidators?.length) throw new AsyncValidatorError(this)
	}

	validateBaseSync(v: T, _opts: DecodeContext): Result<T, RTError> {
		this.checkSync()
		try {
			for (const valid of this.validators || []) {
				const res = valid(v)
				if (isErr(res)) return res
			}
		} catch (e) {
			if (e instanceof AsyncValidatorError) throw e
			return validatorThrew(e)
		}
		return ok(v)
	}

	default(value: DefaultValue<T>): Type<T> {
		return new DefaultType(this, value)
	}

	optional(): OptionalType<T> {
		return new OptionalType(this)
	}

	nullable(): NullableType<T> {
		return new NullableType(this)
	}

	// Rebuild this type with every child replaced by fn(child) - the recursion hook for
	// deepPartial()/deepPatch(). Each combinator owns its own case, so no instanceof chain
	// over every subclass. Default: leaves and as-is types (scalars, array, tuple) return themselves.
	deepMap(_fn: (t: Type<unknown>) => Type<unknown>): Type<unknown> {
		// Type is invariant in T (validators), so the widening needs a cast
		return this as unknown as Type<unknown>
	}
}

// Append src's own validators to dst's. Copy-on-write via addValidator(), so dst may be a
// shared instance: the caller gets a clone and the original is left untouched.
// biome-ignore lint/suspicious/noExplicitAny: Type<any> is the only bound every Type instance satisfies
export function copyValidators<S, D extends Type<any>>(src: Type<S>, dst: D): D {
	let out = dst
	// biome-ignore lint/suspicious/noExplicitAny: the validator is deliberately run against the derived shape
	for (const v of src.validators ?? []) out = out.addValidator(v as Validator<any>)
	// biome-ignore lint/suspicious/noExplicitAny: the validator is deliberately run against the derived shape
	for (const v of src.asyncValidators ?? []) out = out.addAsyncValidator(v as AsyncValidator<any>)
	return out
}

export class AsyncValidatorError extends Error {
	// biome-ignore lint/suspicious/noExplicitAny: Type<any> is the only bound every Type instance satisfies
	readonly type: Type<any>

	// biome-ignore lint/suspicious/noExplicitAny: Type is invariant in T; unknown would force a cast at every throw site
	constructor(type: Type<any>) {
		super(
			`validateSync() cannot be used on type '${type.print()}': it has async validators, use validate() instead`
		)
		this.name = 'AsyncValidatorError'
		this.type = type
	}
}

// Compatibility
export type TypeOf<D> = D extends {
	decode: (u: unknown, opts: DecodeContext) => Result<infer T, RTError>
}
	? T
	: never
export type RTError = { path: string[]; error: string }[]

export function decode<T>(
	type: Type<T>,
	value: unknown,
	opts: DecoderOpts = {}
): Result<T, RTError> {
	return type.decode(value, resolveContext(opts))
}

export async function validate<T>(
	type: Type<T>,
	value: unknown,
	opts: DecoderOpts = {}
): Promise<Result<T, RTError>> {
	const ctx = resolveContext(opts)
	const res = type.decode(value, ctx)
	if (isErr(res)) return res
	return type.validate(res.ok, ctx)
}

export function validateSync<T>(
	type: Type<T>,
	value: unknown,
	opts: DecoderOpts = {}
): Result<T, RTError> {
	const ctx = resolveContext(opts)
	const res = type.decode(value, ctx)
	if (isErr(res)) return res
	return type.validateSync(res.ok, ctx)
}

export function error(error: string, path: string[] = []): Err<RTError> {
	return err([{ path, error }])
}

// Built-in coercers //
///////////////////////
// One precomputed function per reachable flag combination, so resolveContext() only selects
// and never builds a closure. The behavior is lifted verbatim from the scalar decode() bodies.
const numberToString: Coercer<string> = (u) =>
	typeof u === 'number' ? ok('' + u) : error('expected string')

const stringToNumber: Coercer<number> = (u) =>
	typeof u === 'string' && !Number.isNaN(+u) ? ok(+u) : error('expected number')

const stringToNumberNaN: Coercer<number> = (u) =>
	typeof u === 'string' ? ok(+u) : error('expected number')

const numberToBoolean: Coercer<boolean> = (u) =>
	typeof u === 'number' ? ok(!!u) : error('expected boolean')

// The string source can never be enabled without the number one, so there is no string-only
// variant: its gate implies the number gate.
const scalarToBoolean: Coercer<boolean> = (u) =>
	typeof u === 'number'
		? ok(!!u)
		: typeof u === 'string'
			? ok(Number.isFinite(+u) ? !!+u : !!u)
			: error('expected boolean')

function toDate(u: string | number): Result<Date, RTError> {
	const date = new Date(u)
	return Number.isNaN(date.valueOf()) ? error('expected date') : ok(date)
}

const stringToDate: Coercer<Date> = (u) =>
	typeof u === 'string' ? toDate(u) : error('expected date')

const numberToDate: Coercer<Date> = (u) =>
	typeof u === 'number' ? toDate(u) : error('expected date')

const anyToDate: Coercer<Date> = (u) =>
	typeof u === 'string' || typeof u === 'number' ? toDate(u) : error('expected date')

function toBigInt(u: string | number): Result<bigint, RTError> {
	try {
		return ok(BigInt(u))
	} catch {
		return error('expected bigint')
	}
}

const stringToBigInt: Coercer<bigint> = (u) =>
	typeof u === 'string' ? toBigInt(u) : error('expected bigint')

// A fractional or infinite number has no bigint value at all
const numberToBigInt: Coercer<bigint> = (u) =>
	typeof u === 'number' && Number.isInteger(u) ? toBigInt(u) : error('expected bigint')

const anyToBigInt: Coercer<bigint> = (u) =>
	typeof u === 'string' || (typeof u === 'number' && Number.isInteger(u))
		? toBigInt(u)
		: error('expected bigint')

// Resolve the boolean coercion flags into functions once, at the entry point, so that no
// decode() below ever reads a flag again and an explicitly supplied slot wins over the flags.
export function resolveContext(opts: DecoderOpts): DecodeContext {
	const scalar = opts.coerceScalar || opts.coerceAll
	const dateGroup = opts.coerceDate || opts.coerceAll
	const bigIntGroup = opts.coerceBigInt || opts.coerceAll

	const coerceToString =
		opts.coerceToString ?? (opts.coerceNumberToString || scalar ? numberToString : undefined)

	const coerceToNumber =
		opts.coerceToNumber ??
		(opts.coerceStringToNumber || scalar
			? opts.acceptNaN
				? stringToNumberNaN
				: stringToNumber
			: undefined)

	// string -> boolean goes through the number path, so it needs both flags
	const strToBool = (opts.coerceStringToNumber && opts.coerceNumberToBoolean) || scalar
	const coerceToBoolean =
		opts.coerceToBoolean ??
		(strToBool
			? scalarToBoolean
			: opts.coerceNumberToBoolean || scalar
				? numberToBoolean
				: undefined)

	const s2d = opts.coerceStringToDate || dateGroup
	const n2d = opts.coerceNumberToDate || dateGroup
	const coerceToDate =
		opts.coerceToDate ??
		(s2d && n2d ? anyToDate : s2d ? stringToDate : n2d ? numberToDate : undefined)

	const s2b = opts.coerceStringToBigInt || bigIntGroup
	const n2b = opts.coerceNumberToBigInt || bigIntGroup
	const coerceToBigInt =
		opts.coerceToBigInt ??
		(s2b && n2b ? anyToBigInt : s2b ? stringToBigInt : n2b ? numberToBigInt : undefined)

	// Nothing to add: a DecoderOpts is already a DecodeContext, so forward it and allocate nothing.
	if (!coerceToString && !coerceToNumber && !coerceToBoolean && !coerceToDate && !coerceToBigInt)
		return opts

	// One fixed-shape literal, so this object and every opts.* read below it stay monomorphic.
	return {
		coerceToString,
		coerceToNumber,
		coerceToBoolean,
		coerceToDate,
		coerceToBigInt,
		coerceToArray: opts.coerceToArray,
		acceptNaN: opts.acceptNaN,
		unknownFields: opts.unknownFields
	}
}

// An object default is returned by reference, so every decode would share one instance;
// only a factory is safe, and for an object T it is the only form accepted. Distributive
// on purpose: a `string | {a:1}` default still rejects the object half, while `unknown`/
// `any` fall through to the runtime check in DefaultType's constructor.
export type DefaultValue<T> = T extends object ? () => T : T | (() => T)

// Default //
/////////////
export class DefaultType<T> extends Type<T> {
	type: Type<T>
	defaultValue: T | (() => T)

	constructor(type: Type<T>, defaultValue: DefaultValue<T>) {
		super()
		// A stored object is returned by reference, so every decode shares one instance.
		// Object.freeze() is shallow and does not stop Date's setTime(); a factory is the only safe form.
		if (typeof defaultValue === 'object' && defaultValue !== null) {
			throw new TypeError(
				'default()/withDefault() needs a factory for object, array and Date defaults: ' +
					'a stored value is returned by reference, so every decode shares one instance. ' +
					'Use .default(() => ({ ... })) or withDefault(type, () => ({ ... })).'
			)
		}
		this.type = type
		this.defaultValue = defaultValue as T | (() => T)
	}

	private getDefault(): T {
		return typeof this.defaultValue === 'function'
			? (this.defaultValue as () => T)()
			: this.defaultValue
	}

	print() {
		const defVal =
			typeof this.defaultValue === 'function'
				? '<factory>'
				: JSON.stringify(this.defaultValue)
		return `${this.type.print()} = ${defVal}`
	}

	decode(u: unknown, opts: DecodeContext): Result<T, RTError> {
		// The default goes through the inner type like any other value: a factory that
		// returns a wrong-shaped object is a programming error, not silently valid data.
		return this.type.decode(u === undefined ? this.getDefault() : u, opts)
	}

	async validate(v: T, opts: DecodeContext) {
		const res = await this.type.validate(v, opts)
		return isErr(res) ? res : this.validateBase(v, opts)
	}

	validateSync(v: T, opts: DecodeContext): Result<T, RTError> {
		this.checkSync()
		const res = this.type.validateSync(v, opts)
		return isErr(res) ? res : this.validateBaseSync(v, opts)
	}
}

// A bare default prints as `number = 7`, so `number = 7 | null` would read as the
// default being `7 | null`. Parenthesize it inside optional()/nullable().
// biome-ignore lint/suspicious/noExplicitAny: Type is invariant in T; unknown would force a cast at both call sites
function printInner(type: Type<any>): string {
	return type instanceof DefaultType ? `(${type.print()})` : type.print()
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
		return printInner(this.type) + ' | undefined'
	}

	decode(u: unknown, opts: DecodeContext): Result<T | undefined, RTError> {
		// Only a default claims `undefined`. Delegating to any inner type would let decoder
		// coercion options (coerceToArray) turn an absent field into a value.
		if (u === undefined) {
			return this.type instanceof DefaultType ? this.type.decode(u, opts) : ok(undefined)
		}
		const res = this.type.decode(u, opts)
		return isOk(res) ? res : err(res.err)
	}

	async validate(v: T | undefined, opts: DecodeContext) {
		if (v === undefined) return ok(undefined)
		const res = await this.type.validate(v, opts)
		return isErr(res) ? res : this.validateBase(v, opts)
	}

	validateSync(v: T | undefined, opts: DecodeContext): Result<T | undefined, RTError> {
		this.checkSync()
		if (v === undefined) return ok(undefined)
		const res = this.type.validateSync(v, opts)
		return isErr(res) ? res : this.validateBaseSync(v, opts)
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
		return (
			printInner(this.type) +
			(isOk(this.type.decode(null, {})) ? '' : ' | null') +
			(acceptsUndefined(this.type as Type<unknown>) ? '' : ' | undefined')
		)
	}

	decode(u: unknown, opts: DecodeContext) {
		// Same as OptionalType: a directly wrapped withDefault() still fires on undefined,
		// nothing else gets to see the sentinel. `null` is this wrapper's own answer.
		if (u === null) return ok(u)
		if (u === undefined) {
			return this.type instanceof DefaultType ? this.type.decode(u, opts) : ok(u)
		}
		const res = this.type.decode(u, opts)
		return isOk(res) ? res : err(res.err)
	}

	async validate(v: T | null | undefined, opts: DecodeContext) {
		if (v === null || v === undefined) return ok(v)
		const res = await this.type.validate(v, opts)
		return isErr(res) ? res : this.validateBase(v, opts)
	}

	validateSync(
		v: T | null | undefined,
		opts: DecodeContext
	): Result<T | null | undefined, RTError> {
		this.checkSync()
		if (v === null || v === undefined) return ok(v)
		const res = this.type.validateSync(v, opts)
		return isErr(res) ? res : this.validateBaseSync(v, opts)
	}
}

// True when the type handles `undefined` on its own. Structural for the wrappers, so print()
// and the struct combinators never fire a factory default as a side effect. Leaves still get
// probed - they have no factories. (A default buried inside record()/union()/lazy() is still
// reached by the probe; that is a rare enough shape to leave alone.)
export function acceptsUndefined(type: Type<unknown>): boolean {
	if (type instanceof DefaultType || type instanceof OptionalType || type instanceof NullableType)
		return true
	return isOk(type.decode(undefined, {}))
}

// Composable functions //
//////////////////////////
export function withDefault<T>(type: Type<T>, defaultValue: DefaultValue<T>): DefaultType<T> {
	return new DefaultType(type, defaultValue)
}

export function optional<T>(type: Type<T>): OptionalType<T> {
	return new OptionalType(type)
}

export function nullable<T>(type: Type<T>): NullableType<T> {
	return new NullableType(type)
}

// vim: ts=4
