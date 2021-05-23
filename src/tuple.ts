import { Result, ok, err, isErr } from './utils'
import { Decoder } from './decoder'

// Tuple //
///////////
class TupleDecoder<A extends ReadonlyArray<unknown>> extends Decoder<{ [K in keyof A]: A[K] }> {
	memberTypes: { [K in keyof A]: Decoder<A[K]> }

	constructor(memberTypes: { [K in keyof A]: Decoder<A[K]> }) {
		super()
		this.memberTypes = memberTypes
	}

	print() {
		return '[' + this.memberTypes.map(member => member.print()).join(', ') + ']'
	}

	decode(u: unknown) {
		let errors: string[] = []
		if (!Array.isArray(u)) {
			return err('expected Array')
		}
		if (u.length !== this.memberTypes.length) {
			return err('missing fields in Tuple')
		}

		for (let i = 0; i < u.length; i++) {
			const res = this.memberTypes[i].decode(u[i])
			if (isErr(res)) errors.push(`${i}: ${res.err}`)
		}
		if (errors.length) return err(errors.join('\n'))
		// return ok(u as { [K in keyof A]: A[K] })
		return ok(u as any)
	}
}

export function tuple<A extends ReadonlyArray<unknown>>(...memberTypes: { [K in keyof A]: Decoder<A[K]> }): Decoder<{ [K in keyof A]: A[K] }> {
	return new TupleDecoder(memberTypes)
}

// vim: ts=4
