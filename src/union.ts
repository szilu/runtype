import { Result, err, isOk } from './utils'
import { Decoder } from './decoder'

// Union //
///////////
class UnionDecoder<T extends ReadonlyArray<unknown>> extends Decoder/*BaseDecoder*/<T[number]> {
	members: { [K in keyof T]: Decoder<T[K]> }

	constructor(members: { [K in keyof T]: Decoder<T[K]> }) {
		super()
		this.members = members
	}

	print() {
		return this.members.map(member => member.print()).join(' | ')
	}

	decode(u: unknown): Result<T[number]> {
		let errors: string[] = []

		for (const m of this.members) {
			const matched = m.decode(u)
			if (isOk(matched)) return matched
		}
		return err(`expected UNION FIXME`)
	}
}

export function union<T extends ReadonlyArray<unknown>>(...members: { [K in keyof T]: Decoder<T[K]> }): Decoder<T[number]> {
	return new UnionDecoder(members)
}

// vim: ts=4
