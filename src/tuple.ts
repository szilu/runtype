import { Result, ok, err, isOk, isErr } from './utils'
import { Type, DecoderOpts, RTError, error } from './type'

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
		let errors: RTError = []

		if (!Array.isArray(u)) {
			return error('expected Array')
		}
		if (u.length !== this.memberTypes.length) {
			return error(`tuple length must be ${this.memberTypes.length}`)
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

	async validate(v: A, opts: DecoderOpts) {
		let errors: RTError = []
		for (let i = 0; i < v.length; i++) {
			const res = await this.memberTypes[i].validate(v[i], opts)
			if (isErr(res)) {
				errors.push(...res.err.map(error => ({ path: ['' + i, ...error.path], error: error.error })))
			}
		}
		if (errors.length) return err(errors)
		return this.validateBase(v, opts)
	}
}

// export function tuple<A extends ReadonlyArray<unknown>>(...memberTypes: { [K in keyof A]: Type<A[K]> }): Type<{ [K in keyof A]: A[K] }> {
export function tuple<A extends ReadonlyArray<unknown>>(...memberTypes: { [K in keyof A]: Type<A[K]> }): Type<A> {
	return new TupleType<A>(memberTypes)
}

// vim: ts=4
