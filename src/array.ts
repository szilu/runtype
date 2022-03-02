import { Result, ok, err, isOk, isErr } from './utils'
import { Type, DecoderOpts, RTError, error } from './type'

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

	decode(u: unknown, opts: DecoderOpts): Result<T[], RTError> {
		const ret: T[] = []
		let errors: RTError = []

		if (!Array.isArray(u)) return error('expected Array')

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

	async validate(v: T[], opts: DecoderOpts): Promise<Result<T[], RTError>> {
		for (let i = 0; i < v.length; i++) {
			const res = await this.memberType.validate(v[i], opts)
			if (isErr(res)) {
				return err(res.err.map(error => ({ path: ['' + i, ...error.path], error: error.error })))
			}
		}
		return this.validateBase(v, opts)
	}

	// Validators
	length(minLen: number, maxLen?: number) {
		if (maxLen == undefined) {
			return this.addValidator((v: T[]) => v.length == minLen ? ok(v)
				: error(`length must be ${minLen}`))
		} else {
			return this.addValidator((v: T[]) => minLen <= v.length && v.length <= maxLen ? ok(v)
				: error(`length must be between ${minLen} and ${maxLen}`))
		}
	}

	minLength(len: number) {
		return this.addValidator((v: T[]) => v.length >= len ? ok(v)
			: error(`length must be at least ${len}`))
	}

	maxLength(len: number) {
		return this.addValidator((v: T[]) => v.length <= len ? ok(v)
			: error(`length must be at most ${len}`))
	}
}

//export function array<T>(memberType: Type<T>): Type<T[]> {
export function array<T>(memberType: Type<T>): ArrayType<T> {
	return new ArrayType(memberType)
}

// vim: ts=4
