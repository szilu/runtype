import { Result, ok, err, isOk } from './utils'
import { Type, DecoderOpts } from './type'

// Constants //
///////////////
class ConstantDecoder<T> extends Type<T> {
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
class StringDecoder extends Type<string> {
	print() {
		return 'string'
	}

	decode(u: unknown, opts: DecoderOpts) {
		switch (typeof u) {
			case 'string': return ok(u)
			case 'number': if (opts.coerceNumberToString || opts.coerceScalar || opts.coerceAll) return ok('' + u)
			default: return err('expected string')
		}
	}
}
export const string = new StringDecoder()

// Number //
////////////
class NumberDecoder extends Type<number> {
	print() {
		return 'number'
	}

	decode(u: unknown, opts: DecoderOpts) {
		switch (typeof u) {
			case 'number': if (opts.acceptNaN || !Number.isNaN(u)) return ok(u)
			case 'string': if (opts.coerceStringToNumber || opts.coerceScalar || opts.coerceAll) return ok(+u)
			default: return err('expected number')
		}
	}
}
export const number = new NumberDecoder()

// Integer //
/////////////
class IntegerDecoder extends Type<number> {
	print() {
		return 'integer'
	}

	decode(u: unknown, opts: DecoderOpts) {
		const num = number.decode(u, opts)
		if (isOk(num) && Number.isInteger(u)) return num; else return err('expected integer')
	}
}
export const integer = new IntegerDecoder()
export const id = new IntegerDecoder()

// Boolean //
/////////////
class BooleanDecoder extends Type<boolean> {
	print() {
		return 'boolean'
	}

	decode(u: unknown, opts: DecoderOpts) {
		switch (typeof u) {
			case 'boolean': return ok(u)
			case 'number': if (opts.coerceNumberToBoolean || opts.coerceScalar || opts.coerceAll) return ok(!!u)
			default: return err('expected boolean')
		}
	}
}
export const boolean = new BooleanDecoder()

// Date //
//////////
class DateDecoder extends Type<Date> {
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
			return err('expected date')
		}
	}
}
export const date = new DateDecoder()

// Any //
/////////
class AnyDecoder extends Type<any> {
	print() {
		return 'any'
	}

	decode(u: unknown, opts: DecoderOpts) {
		return ok(u as any)
	}
}
export const any = new AnyDecoder()

// Literal //
/////////////
type Scalar = boolean | number | string

function isScalar(u: unknown): u is Scalar {
	return typeof u === 'string'
		|| typeof u === 'number'
		|| typeof u === 'boolean'
}

class LiteralDecoder<T extends ReadonlyArray<Scalar>> extends Type<T[number]> {
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
			|| !this.values.includes(u)) return err(`expected ${this.values.map(v => JSON.stringify(v)).join(' | ')}`)
		return ok(u as T[number])
	}
}
export function literal<T extends ReadonlyArray<Scalar>>(...values: T): LiteralDecoder<T> {
	return new LiteralDecoder(values)
}

// vim: ts=4
