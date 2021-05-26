import { Result, ok, err, isOk } from './utils'
import { Type, DecoderOpts } from './type'

// Array //
///////////
class ArrayType<T> extends Type<T[]> {
	memberType: Type<T>

	constructor(memberType: Type<T>) {
		super()
		this.memberType = memberType
	}

	print() {
		const member = this.memberType.print()
		return !/[|&()]/.test(member) ? member + '[]' : '(' + member + ')[]'
	}

	decode(u: unknown, opts: DecoderOpts): Result<T[]> {
		const ret: T[] = []
		let errors: string[] = []

		if (!Array.isArray(u)) return err('expected Array')

		for (let i = 0; i < u.length; i++) {
			const res = this.memberType.decode(u[i], opts)
			if (isOk(res)) {
				ret[i] = res.ok
			} else {
				errors.push(`${i}: ${res.err}`)
			}
		}
		if (errors.length) return err(errors.join('\n'))
		return ok(ret)
	}
}

export function array<T>(memberType: Type<T>): Type<T[]> {
	return new ArrayType(memberType)
}

// vim: ts=4
