import { Result, ok, err, isOk } from './utils'
import { Type, DecoderOpts, RTError, error } from './type'

// Constants //
///////////////
class ConstantType<T> extends Type<T> {
	value: T

	constructor(value: T) {
		super()
		this.value = value
	}

	print() {
		if (this.value === undefined) return 'undefined'
		return JSON.stringify(this.value)
	}

	decode(u: unknown, opts: DecoderOpts) {
		if (u !== this.value) return error('expected ' + JSON.stringify(this.value))
		return ok(u as T)
	}

	async validate(v: T, opts: DecoderOpts) {
		return this.validateBase(v, opts)
	}
}

export const undefinedValue = new ConstantType(undefined)
export const nullValue = new ConstantType(null)
export const trueValue = new ConstantType(true)
export const falseValue = new ConstantType(false)

// String //
////////////
class StringType extends Type<string> {
	print() {
		return 'string'
	}

	decode(u: unknown, opts: DecoderOpts) {
		switch (typeof u) {
			case 'string': return ok(u)
			case 'number': if (opts.coerceNumberToString || opts.coerceScalar || opts.coerceAll) return ok('' + u)
		}
		return error('expected string')
	}

	async validate(v: string, opts: DecoderOpts) {
		return this.validateBase(v, opts)
	}

	// Validators
	in(...list: string[]) {
		return this.addValidator((v: string) => list.indexOf(v) >= 0 ? ok(v)
			: error(`must be one of [${list.map(l => JSON.stringify(l)).join(',')}]`))
	}

	length(minLen: number, maxLen?: number) {
		if (maxLen == undefined) {
			return this.addValidator((v: string) => v.length == minLen ? ok(v)
				: error(`length must be ${minLen}`))
		} else {
			return this.addValidator((v: string) => minLen <= v.length && v.length <= maxLen ? ok(v)
				: error(`length must be between ${minLen} and ${maxLen}`))
		}
	}

	minLength(len: number) {
		return this.addValidator((v: string) => v.length >= len ? ok(v)
			: error(`length must be at least ${len}`))
	}

	maxLength(len: number) {
		return this.addValidator((v: string) => v.length <= len ? ok(v)
			: error(`length must be at most ${len}`))
	}

	matches(pattern: RegExp) {
		return this.addValidator((v: string) => pattern.test(v) ? ok(v)
			: error(`must match ${pattern}`))
	}

	email() {
		const pattern = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
		return this.addValidator((v: string) => pattern.test(v) ? ok(v)
			: error(`must be valid email address`))
	}
}
export const string = new StringType()

// Number //
////////////
class NumberType extends Type<number> {
	print() {
		return 'number'
	}

	decode(u: unknown, opts: DecoderOpts) {
		switch (typeof u) {
			case 'number': if (opts.acceptNaN || !Number.isNaN(u)) {
				return ok(u)
			} else break
			case 'string': if (opts.coerceStringToNumber || opts.coerceScalar || opts.coerceAll) return ok(+u)
		}
		return error('expected number')
	}

	async validate(v: number, opts: DecoderOpts) {
		return this.validateBase(v, opts)
	}

	// Validators
	in(...list: number[]) {
		return this.addValidator((v: number) => list.indexOf(v) >= 0 ? ok(v)
			: error(`must be one of [${list.map(l => JSON.stringify(l)).join(',')}]`))
	}

	integer() {
		return this.addValidator((v: number) => v === Math.round(v) ? ok(v)
			: error(`must be integer`))
	}

	min(min: number) {
		return this.addValidator((v: number) => v >= min ? ok(v)
			: error(`must be at least ${min}`))
	}

	max(max: number) {
		return this.addValidator((v: number) => v <= max ? ok(v)
			: error(`must be at most ${max}`))
	}

	between(min: number, max: number) {
		return this.addValidator((v: number) => min <= v && v <= max ? ok(v)
			: error(`must be between ${min} and ${max}`))
	}
}
export const number = new NumberType()

// Integer //
/////////////
//class IntegerType extends Type<number> {
class IntegerType extends NumberType {
	print() {
		return 'integer'
	}

	decode(u: unknown, opts: DecoderOpts) {
		const num = number.decode(u, opts)
		if (isOk(num) && Number.isInteger(num.ok)) return num; else return error('expected integer')
	}
}
export const integer = new IntegerType()
export const id = new IntegerType()

// Boolean //
/////////////
class BooleanType extends Type<boolean> {
	print() {
		return 'boolean'
	}

	decode(u: unknown, opts: DecoderOpts) {
		switch (typeof u) {
			case 'boolean': return ok(u)
			case 'number': if (opts.coerceNumberToBoolean || opts.coerceScalar || opts.coerceAll) return ok(!!u)
			case 'string': if ((opts.coerceStringToNumber && opts.coerceNumberToBoolean) || opts.coerceScalar || opts.coerceAll) return ok(Number.isFinite(+u) ? !!+u : !!u)
		}
		return error('expected boolean')
	}

	async validate(v: boolean, opts: DecoderOpts) {
		return this.validateBase(v, opts)
	}
}
export const boolean = new BooleanType()

// Date //
//////////
class DateType extends Type<Date> {
	print() {
		return 'Date'
	}

	decode(u: unknown, opts: DecoderOpts) {
		let date

		switch (typeof u) {
			case 'object': if (u instanceof Date && !isNaN(u.valueOf())) return ok(u); break
			case 'string':
				if (opts.coerceStringToDate || opts.coerceDate || opts.coerceAll) date = new Date(u); break
			case 'number':
				if (opts.coerceNumberToDate || opts.coerceDate || opts.coerceAll) date = new Date(u); break
		}
		if (date !== undefined && !isNaN(date.valueOf())) {
			return ok(date)
		} else {
			return error('expected date')
		}
	}

	async validate(v: Date, opts: DecoderOpts) {
		return this.validateBase(v, opts)
	}
}
export const date = new DateType()

// Any //
/////////
class AnyType extends Type<any> {
	print() {
		return 'any'
	}

	decode(u: unknown, opts: DecoderOpts) {
		return ok(u as any)
	}

	async validate(v: any, opts: DecoderOpts) {
		return this.validateBase(v, opts)
	}
}
export const any = new AnyType()

// Unknown //
/////////////
class UnknownType extends Type<{}> {
	print() {
		return 'unknown'
	}

	decode(u: unknown, opts: DecoderOpts) {
		return u != null ? ok(u as {}) : error('expected anything but undefined')
	}

	async validate(v: {}, opts: DecoderOpts) {
		return this.validateBase(v, opts)
	}
}
export const unknown = new UnknownType()

// UnknownObject //
///////////////////
class UnknownObjectType extends Type<{}> {
	print() {
		return 'object'
	}

	decode(u: unknown, opts: DecoderOpts) {
		return typeof u === 'object' && u !== null ? ok(u as {}) : error('expected object')
	}

	async validate(v: {}, opts: DecoderOpts) {
		return this.validateBase(v, opts)
	}
}
export const unknownObject = new UnknownObjectType()

// Literal //
/////////////
type Scalar = boolean | number | string

function isScalar(u: unknown): u is Scalar {
	return typeof u === 'string'
		|| typeof u === 'number'
		|| typeof u === 'boolean'
}

class LiteralType<T extends ReadonlyArray<Scalar>> extends Type<T[number]> {
	values: T

	constructor(values: T) {
		super()
		this.values = values
	}

	print() {
		return this.values.map(v => JSON.stringify(v)).join(' | ')
	}

	decode(u: unknown, opts: DecoderOpts) {
		if (!isScalar(u)
			|| !this.values.includes(u)) return error(`expected ${this.values.map(v => JSON.stringify(v)).join(' | ')}`)
		return ok(u as T[number])
	}

	async validate(v: T[number], opts: DecoderOpts) {
		return this.validateBase(v, opts)
	}

	// Validators
	//in(...list: Scalar[]) {
	in(...list: T[number][]) {
		return this.addValidator((v: Scalar) => list.indexOf(v) >= 0 ? ok(v)
			: error(`must be one of [${list.map(l => JSON.stringify(l)).join(',')}]`))
	}
}

export function literal<T extends ReadonlyArray<Scalar>>(...values: T): LiteralType<T> {
	return new LiteralType(values)
}

// vim: ts=4
