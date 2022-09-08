import { Result, ok, err, isOk, isErr } from './utils'
import { Type, DecoderOpts, RTError, error } from './type'

// Record //
////////////
class RecordType<T> extends Type<Record<string, T>> {
	memberType: Type<T>

	constructor(memberType: Type<T>) {
		super()
		this.memberType = memberType
	}

	print() {
		const member = this.memberType.print()
		return `Record<string, ${!/[|&()]/.test(member) ? member : '(' + member + ')'}>`
	}

	decode(u: unknown, opts: DecoderOpts): Result<Record<string, T>, RTError> {
		const ret: Record<string, T> = {}
		let errors: RTError = []

		if (typeof u != 'object' || Object.prototype.toString.call(u) != '[object Object]') return error('expected Record')

		for (const k in u) {
			if (u.hasOwnProperty(k)) {
				const res = this.memberType.decode((u as any)[k], opts)
				if (isOk(res)) {
					ret[k] = res.ok
				} else {
					errors.push(...res.err.map(error => ({ path: ['' + k, ...error.path], error: error.error })))
				}
			}
		}

		if (errors.length) return err(errors)
		return ok(ret)
	}

	async validate(v: Record<string, T>, opts: DecoderOpts): Promise<Result<Record<string, T>, RTError>> {
		for (const k in v) {
			const res = await this.memberType.validate(v[k], opts)
			if (isErr(res)) {
				return err(res.err.map(error => ({ path: ['' + k, ...error.path], error: error.error })))
			}
		}
		return this.validateBase(v, opts)
	}
}

export function record<T>(memberType: Type<T>): RecordType<T> {
	return new RecordType(memberType)
}

// vim: ts=4
