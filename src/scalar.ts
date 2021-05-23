import { Result, ok, err } from './utils'
import { Decoder } from './decoder'

// Constants //
///////////////
class ConstantDecoder<T> extends Decoder<T> {
	value: T

	constructor(value: T) {
		super()
		this.value = value
	}

	print() {
		if (this.value === undefined) return 'undefined'
		return JSON.stringify(this.value)
	}

	decode(u: unknown) {
		if (u !== this.value) return err('expected ' + JSON.stringify(this.value))
		return ok(u as T)
	}
}

export const undefinedValue = new ConstantDecoder(undefined)
export const nullValue = new ConstantDecoder(null)
export const trueValue = new ConstantDecoder(true)
export const falseValue = new ConstantDecoder(false)

// String //
////////////
class StringDecoder extends Decoder<string> {
	print() {
		return 'string'
	}

	decode(u: unknown) {
		if (typeof u !== 'string') return err('expected string')
		return ok(u)
	}
}
export const string = new StringDecoder()

// Number //
////////////
class NumberDecoder extends Decoder<number> {
	print() {
		return 'number'
	}

	decode(u: unknown) {
		if (typeof u !== 'number' || Number.isNaN(u)) return err('expected number')
		return ok(u)
	}
}
export const number = new NumberDecoder()

// Integer //
/////////////
class IntegerDecoder extends Decoder<number> {
	print() {
		return 'integer'
	}

	decode(u: unknown) {
		if (typeof u !== 'number' || !Number.isInteger(u)) return err('expected integer')
		return ok(u)
	}
}
export const integer = new IntegerDecoder()

// Boolean //
/////////////
class BooleanDecoder extends Decoder<boolean> {
	print() {
		return 'boolean'
	}

	decode(u: unknown) {
		if (typeof u !== 'boolean') return err('expected boolean')
		return ok(u)
	}
}
export const boolean = new BooleanDecoder()

// Date //
//////////
class DateDecoder extends Decoder<Date> {
	print() {
		return 'Date'
	}

	decode(u: unknown) {
		if (typeof u !== 'string' && typeof u !== 'number' && !(u instanceof Date)) return err('expected date')
		const d = u instanceof Date ? u : new Date(u)
		if (isNaN(d.valueOf())) return err('expected date')
		return ok(d)
	}
}
export const date = new DateDecoder()

// Literal //
/////////////
type Scalar = boolean | number | string

function isScalar(u: unknown): u is Scalar {
	return typeof u === 'string'
		|| typeof u === 'number'
		|| typeof u === 'boolean'
}

class LiteralDecoder<T extends ReadonlyArray<Scalar>> extends Decoder<T[number]> {
	values: T

	constructor(values: T) {
		super()
		this.values = values
	}

	print() {
		return this.values.map(v => JSON.stringify(v)).join(' | ')
	}

	decode(u: unknown) {
		if (!isScalar(u)
			|| !this.values.includes(u)) return err(`expected ${this.values.map(v => JSON.stringify(v)).join(' | ')}`)
		return ok(u as T[number])
	}
}
export function literal<T extends ReadonlyArray<Scalar>>(...values: T): LiteralDecoder<T> {
	return new LiteralDecoder(values)
}

// vim: ts=4
