import { Result, ok, err, isOk } from './utils'
import { Type, DecoderOpts, DecoderError, decoderError } from './type'

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

	decode(u: unknown, opts: DecoderOpts): Result<T[], DecoderError> {
		const ret: T[] = []
		let errors: DecoderError = []

		if (!Array.isArray(u)) return decoderError([], 'expected Array')

		for (let i = 0; i < u.length; i++) {
			const res = this.memberType.decode(u[i], opts)
			if (isOk(res)) {
				ret[i] = res.ok
			} else {
				//errors.push(`${i}: ${res.err}`)
				errors.push(...res.err.map(error => ({ path: ['' + i, ...error.path], error: error.error })))
			}
		}
		//if (errors.length) return err(errors.join('\n'))
		if (errors.length) return err(errors)
		return ok(ret)
	}
}

export function array<T>(memberType: Type<T>): Type<T[]> {
	return new ArrayType(memberType)
}

// vim: ts=4
