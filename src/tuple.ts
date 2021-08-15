import { Result, ok, err, isOk } from './utils'
import { Type, DecoderOpts, DecoderError, decoderError } from './type'

// Tuple //
///////////
// class TupleType<A extends ReadonlyArray<unknown>> extends Type<{ [K in keyof A]: A[K] }> {
class TupleType<A extends ReadonlyArray<unknown>> extends Type<A> {
	memberTypes: { [K in keyof A]: Type<A[K]> }

	constructor(memberTypes: { [K in keyof A]: Type<A[K]> }) {
		super()
		this.memberTypes = memberTypes
	}

	print() {
		return '[' + this.memberTypes.map(member => member.print()).join(', ') + ']'
	}

	decode(u: unknown, opts: DecoderOpts) {
		const ret: { -readonly [K in number]?: A[K] } = []
		let errors: DecoderError = []

		if (!Array.isArray(u)) {
			return decoderError([], 'expected Array')
		}
		if (u.length !== this.memberTypes.length) {
			return decoderError([], 'missing fields in Tuple')
		}

		for (let i = 0; i < u.length; i++) {
			const res = this.memberTypes[i].decode(u[i], opts)
			if (isOk(res)) {
				ret[i] = res.ok
			} else {
				//errors.push(`${i}: ${res.err}`)
				errors.push(...res.err.map(error => ({ path: ['' + i, ...error.path], error: error.error })))
			}
		}
		//if (errors.length) return err(errors.join('\n'))
		if (errors.length) return err(errors)
		return ok(ret as A)
	}
}

// export function tuple<A extends ReadonlyArray<unknown>>(...memberTypes: { [K in keyof A]: Type<A[K]> }): Type<{ [K in keyof A]: A[K] }> {
export function tuple<A extends ReadonlyArray<unknown>>(...memberTypes: { [K in keyof A]: Type<A[K]> }): Type<A> {
	return new TupleType<A>(memberTypes)
}

// vim: ts=4
