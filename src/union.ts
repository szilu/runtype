import { Result, err, isOk } from './utils'
import { Type, DecoderOpts, DecoderError, decoderError } from './type'

// Union //
///////////
class UnionType<T extends ReadonlyArray<unknown>> extends Type/*BaseDecoder*/<T[number]> {
	members: { [K in keyof T]: Type<T[K]> }

	constructor(members: { [K in keyof T]: Type<T[K]> }) {
		super()
		this.members = members
	}

	print() {
		return this.members.map(member => member.print()).join(' | ')
	}

	decode(u: unknown, opts: DecoderOpts): Result<T[number], DecoderError> {
		let errors: string[] = []

		for (const m of this.members) {
			const matched = m.decode(u, opts)
			if (isOk(matched)) {
				return matched
			}
		}
		return decoderError([], `non of the union type members matched`)
	}
}

export function union<T extends ReadonlyArray<unknown>>(...members: { [K in keyof T]: Type<T[K]> }): Type<T[number]> {
	return new UnionType(members)
}

// vim: ts=4
