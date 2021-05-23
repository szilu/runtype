import { Result, ok, err, isErr } from './utils'
import { Decoder } from './decoder'

// Array //
///////////
class ArrayDecoder<T> extends Decoder<T[]> {
	memberType: Decoder<T>

	constructor(memberType: Decoder<T>) {
		super()
		this.memberType = memberType
	}

	print() {
		const member = this.memberType.print()
		return !/[|&()]/.test(member) ? member + '[]' : '(' + member + ')[]'
	}

	decode(u: unknown): Result<T[]> {
		let errors: string[] = []
		if (!Array.isArray(u)) return err('expected Array')

		for (let i = 0; i < u.length; i++) {
			const res = this.memberType.decode(u[i])
			if (isErr(res)) errors.push(`${i}: ${res.err}`)
		}
		if (errors.length) return err(errors.join('\n'))
		return ok(u as T[])
	}
}

export function array<T>(memberType: Decoder<T>): Decoder<T[]> {
	return new ArrayDecoder(memberType)
}

// vim: ts=4
