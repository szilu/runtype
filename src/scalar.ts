import { type DecodeContext, error, type RTError, runCoercer, Type } from './type.js'
import { isErr, ok, type Result } from './utils.js'

// Constants //
///////////////
export class ConstantType<T> extends Type<T> {
	value: T

	constructor(value: T) {
		super()
		this.value = value
	}

	print() {
		if (this.value === undefined) return 'undefined'
		return JSON.stringify(this.value)
	}

	decode(u: unknown, _opts: DecodeContext) {
		if (u !== this.value) return error('expected ' + JSON.stringify(this.value))
		return ok(u as T)
	}

	async validate(v: T, opts: DecodeContext) {
		return this.validateBase(v, opts)
	}

	validateSync(v: T, opts: DecodeContext): Result<T, RTError> {
		return this.validateBaseSync(v, opts)
	}
}

export const undefinedValue = new ConstantType(undefined)
export const nullValue = new ConstantType(null)
export const trueValue = new ConstantType<true>(true)
export const falseValue = new ConstantType<false>(false)

// String //
////////////
export class StringType extends Type<string> {
	print() {
		return 'string'
	}

	decode(u: unknown, opts: DecodeContext) {
		if (typeof u === 'string') return ok(u)
		return opts.coerceToString ? runCoercer(opts.coerceToString, u) : error('expected string')
	}

	async validate(v: string, opts: DecodeContext) {
		return this.validateBase(v, opts)
	}

	validateSync(v: string, opts: DecodeContext): Result<string, RTError> {
		return this.validateBaseSync(v, opts)
	}

	// Validators
	in(...list: string[]) {
		return this.addValidator((v: string) =>
			list.indexOf(v) >= 0
				? ok(v)
				: error(`must be one of [${list.map((l) => JSON.stringify(l)).join(',')}]`)
		)
	}

	length(minLen: number, maxLen?: number) {
		if (maxLen == undefined) {
			return this.addValidator((v: string) =>
				v.length == minLen ? ok(v) : error(`length must be ${minLen}`)
			)
		} else {
			return this.addValidator((v: string) =>
				minLen <= v.length && v.length <= maxLen
					? ok(v)
					: error(`length must be between ${minLen} and ${maxLen}`)
			)
		}
	}

	minLength(len: number) {
		return this.addValidator((v: string) =>
			v.length >= len ? ok(v) : error(`length must be at least ${len}`)
		)
	}

	maxLength(len: number) {
		return this.addValidator((v: string) =>
			v.length <= len ? ok(v) : error(`length must be at most ${len}`)
		)
	}

	matches(pattern: RegExp) {
		return this.addValidator((v: string) =>
			pattern.test(v) ? ok(v) : error(`must match ${pattern}`)
		)
	}

	email() {
		const pattern =
			/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
		return this.addValidator((v: string) =>
			pattern.test(v) ? ok(v) : error(`must be valid email address`)
		)
	}
}
export const string = new StringType()

// Number //
////////////
export class NumberType extends Type<number> {
	print() {
		return 'number'
	}

	decode(u: unknown, opts: DecodeContext) {
		if (typeof u === 'number')
			return opts.acceptNaN || !Number.isNaN(u) ? ok(u) : error('expected number')
		return opts.coerceToNumber ? runCoercer(opts.coerceToNumber, u) : error('expected number')
	}

	async validate(v: number, opts: DecodeContext) {
		return this.validateBase(v, opts)
	}

	validateSync(v: number, opts: DecodeContext): Result<number, RTError> {
		return this.validateBaseSync(v, opts)
	}

	// Validators
	in(...list: number[]) {
		return this.addValidator((v: number) =>
			list.indexOf(v) >= 0
				? ok(v)
				: error(`must be one of [${list.map((l) => JSON.stringify(l)).join(',')}]`)
		)
	}

	integer() {
		return this.addValidator((v: number) =>
			v === Math.round(v) ? ok(v) : error(`must be integer`)
		)
	}

	min(min: number) {
		return this.addValidator((v: number) =>
			v >= min ? ok(v) : error(`must be at least ${min}`)
		)
	}

	max(max: number) {
		return this.addValidator((v: number) =>
			v <= max ? ok(v) : error(`must be at most ${max}`)
		)
	}

	between(min: number, max: number) {
		return this.addValidator((v: number) =>
			min <= v && v <= max ? ok(v) : error(`must be between ${min} and ${max}`)
		)
	}
}
export const number = new NumberType()

// Integer //
/////////////
export class IntegerType extends NumberType {
	print() {
		return 'integer'
	}

	decode(u: unknown, opts: DecodeContext) {
		// Number.isInteger() is false for a non-number, so the no-hook and wrong-type cases
		// need no branch of their own - and NaN fails it whatever acceptNaN says.
		if (typeof u !== 'number' && opts.coerceToNumber) {
			const num = runCoercer(opts.coerceToNumber, u)
			if (isErr(num)) return num
			u = num.ok
		}
		return Number.isInteger(u) ? ok(u as number) : error('expected integer')
	}
}
export const integer = new IntegerType()
export const id = new IntegerType()

// Boolean //
/////////////
export class BooleanType extends Type<boolean> {
	print() {
		return 'boolean'
	}

	decode(u: unknown, opts: DecodeContext) {
		if (typeof u === 'boolean') return ok(u)
		return opts.coerceToBoolean
			? runCoercer(opts.coerceToBoolean, u)
			: error('expected boolean')
	}

	async validate(v: boolean, opts: DecodeContext) {
		return this.validateBase(v, opts)
	}

	validateSync(v: boolean, opts: DecodeContext): Result<boolean, RTError> {
		return this.validateBaseSync(v, opts)
	}

	true() {
		return this.addValidator((v: boolean) => (v ? ok(v) : error('must be true')))
	}

	false() {
		return this.addValidator((v: boolean) => (!v ? ok(v) : error('must be false')))
	}
}
export const boolean = new BooleanType()

// Date //
//////////
export class DateType extends Type<Date> {
	print() {
		return 'Date'
	}

	decode(u: unknown, opts: DecodeContext) {
		if (u instanceof Date) return Number.isNaN(u.valueOf()) ? error('expected date') : ok(u)
		return opts.coerceToDate ? runCoercer(opts.coerceToDate, u) : error('expected date')
	}

	async validate(v: Date, opts: DecodeContext) {
		return this.validateBase(v, opts)
	}

	validateSync(v: Date, opts: DecodeContext): Result<Date, RTError> {
		return this.validateBaseSync(v, opts)
	}
}
export const date = new DateType()

// Any //
/////////
// biome-ignore lint/suspicious/noExplicitAny: the `any` scalar must be Type<any>
export class AnyType extends Type<any> {
	print() {
		return 'any'
	}

	// biome-ignore lint/suspicious/noExplicitAny: yields `any` by definition
	decode(u: unknown, _opts: DecodeContext): Result<any, RTError> {
		return ok(u)
	}

	// biome-ignore lint/suspicious/noExplicitAny: accepts any value by definition
	async validate(v: any, opts: DecodeContext): Promise<Result<any, RTError>> {
		return this.validateBase(v, opts)
	}

	// biome-ignore lint/suspicious/noExplicitAny: accepts any value by definition
	validateSync(v: any, opts: DecodeContext): Result<any, RTError> {
		return this.validateBaseSync(v, opts)
	}
}
export const any = new AnyType()

// Unknown //
/////////////
export class UnknownType extends Type<unknown> {
	print() {
		return 'unknown'
	}

	decode(u: unknown, _opts: DecodeContext) {
		return ok(u)
	}

	async validate(v: unknown, opts: DecodeContext) {
		return this.validateBase(v, opts)
	}

	validateSync(v: unknown, opts: DecodeContext): Result<unknown, RTError> {
		return this.validateBaseSync(v, opts)
	}
}
export const unknown = new UnknownType()

// Defined //
/////////////
export class DefinedType extends Type<{}> {
	print() {
		return '{}'
	}

	decode(u: unknown, _opts: DecodeContext) {
		return u != null ? ok(u as {}) : error('expected defined value')
	}

	async validate(v: {}, opts: DecodeContext) {
		return this.validateBase(v, opts)
	}

	validateSync(v: {}, opts: DecodeContext): Result<{}, RTError> {
		return this.validateBaseSync(v, opts)
	}
}
export const defined = new DefinedType()

// UnknownObject //
///////////////////
export class UnknownObjectType extends Type<object> {
	print() {
		return 'object'
	}

	decode(u: unknown, _opts: DecodeContext) {
		return typeof u === 'object' && u !== null ? ok(u as object) : error('expected object')
	}

	async validate(v: object, opts: DecodeContext) {
		return this.validateBase(v, opts)
	}

	validateSync(v: object, opts: DecodeContext): Result<object, RTError> {
		return this.validateBaseSync(v, opts)
	}
}
export const unknownObject = new UnknownObjectType()

// BigInt //
////////////
export class BigIntType extends Type<bigint> {
	print() {
		return 'bigint'
	}

	decode(u: unknown, opts: DecodeContext) {
		if (typeof u === 'bigint') return ok(u)
		return opts.coerceToBigInt ? runCoercer(opts.coerceToBigInt, u) : error('expected bigint')
	}

	async validate(v: bigint, opts: DecodeContext) {
		return this.validateBase(v, opts)
	}

	validateSync(v: bigint, opts: DecodeContext): Result<bigint, RTError> {
		return this.validateBaseSync(v, opts)
	}

	// Validators
	min(min: bigint) {
		return this.addValidator((v: bigint) =>
			v >= min ? ok(v) : error(`must be at least ${min}`)
		)
	}

	max(max: bigint) {
		return this.addValidator((v: bigint) =>
			v <= max ? ok(v) : error(`must be at most ${max}`)
		)
	}

	between(min: bigint, max: bigint) {
		return this.addValidator((v: bigint) =>
			min <= v && v <= max ? ok(v) : error(`must be between ${min} and ${max}`)
		)
	}

	positive() {
		return this.addValidator((v: bigint) => (v > 0n ? ok(v) : error('must be positive')))
	}

	negative() {
		return this.addValidator((v: bigint) => (v < 0n ? ok(v) : error('must be negative')))
	}

	nonNegative() {
		return this.addValidator((v: bigint) => (v >= 0n ? ok(v) : error('must be non-negative')))
	}
}
export const bigint = new BigIntType()

// Symbol //
////////////
export class SymbolType extends Type<symbol> {
	print() {
		return 'symbol'
	}

	decode(u: unknown, _opts: DecodeContext) {
		return typeof u === 'symbol' ? ok(u) : error('expected symbol')
	}

	async validate(v: symbol, opts: DecodeContext) {
		return this.validateBase(v, opts)
	}

	validateSync(v: symbol, opts: DecodeContext): Result<symbol, RTError> {
		return this.validateBaseSync(v, opts)
	}
}
export const symbol = new SymbolType()

// Void //
//////////
export class VoidType extends Type<void> {
	print() {
		return 'void'
	}

	decode(u: unknown, _opts: DecodeContext) {
		return u === undefined ? ok(undefined) : error('expected undefined')
	}

	async validate(v: undefined, opts: DecodeContext) {
		return this.validateBase(v, opts)
	}

	validateSync(v: undefined, opts: DecodeContext): Result<void, RTError> {
		return this.validateBaseSync(v, opts)
	}
}
export const voidType = new VoidType()

// Never //
///////////
export class NeverType extends Type<never> {
	print() {
		return 'never'
	}

	decode(_u: unknown, _opts: DecodeContext): Result<never, RTError> {
		return error('never type cannot be satisfied')
	}

	async validate(_v: never, _opts: DecodeContext): Promise<Result<never, RTError>> {
		return error('never type cannot be satisfied')
	}

	validateSync(_v: never, _opts: DecodeContext): Result<never, RTError> {
		return error('never type cannot be satisfied')
	}
}
export const never = new NeverType()

// Literal //
/////////////
type Scalar = boolean | number | string

function isScalar(u: unknown): u is Scalar {
	return typeof u === 'string' || typeof u === 'number' || typeof u === 'boolean'
}

export class LiteralType<T extends ReadonlyArray<Scalar>> extends Type<T[number]> {
	values: T

	constructor(values: T) {
		super()
		this.values = values
	}

	print() {
		return this.values.map((v) => JSON.stringify(v)).join(' | ')
	}

	decode(u: unknown, _opts: DecodeContext) {
		if (!isScalar(u) || !this.values.includes(u))
			return error(`expected ${this.values.map((v) => JSON.stringify(v)).join(' | ')}`)
		return ok(u as T[number])
	}

	async validate(v: T[number], opts: DecodeContext) {
		return this.validateBase(v, opts)
	}

	validateSync(v: T[number], opts: DecodeContext): Result<T[number], RTError> {
		return this.validateBaseSync(v, opts)
	}

	// Validators
	in(...list: T[number][]) {
		return this.addValidator((v: Scalar) =>
			list.indexOf(v) >= 0
				? ok(v)
				: error(`must be one of [${list.map((l) => JSON.stringify(l)).join(',')}]`)
		)
	}
}

export function literal<const T extends ReadonlyArray<Scalar>>(...values: T): LiteralType<T> {
	return new LiteralType(values)
}

// vim: ts=4
