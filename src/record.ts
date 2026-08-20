import { type Result, ok, err, isOk, isErr } from './utils.js'
import { Type, type DecoderOpts, type RTError, error } from './type.js'

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
		const errors: RTError = []

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
		const errors: RTError = []

		for (const k in v) {
			if (!Object.prototype.hasOwnProperty.call(v, k)) continue
			const res = await this.memberType.validate(v[k], opts)
			if (isErr(res)) {
				errors.push(...res.err.map(error => ({ path: ['' + k, ...error.path], error: error.error })))
			}
		}
		if (errors.length) return err(errors)
		return this.validateBase(v, opts)
	}

	validateSync(v: Record<string, T>, opts: DecoderOpts): Result<Record<string, T>, RTError> {
		const errors: RTError = []

		for (const k in v) {
			if (!Object.prototype.hasOwnProperty.call(v, k)) continue
			const res = this.memberType.validateSync(v[k], opts)
			if (isErr(res)) {
				errors.push(...res.err.map(error => ({ path: ['' + k, ...error.path], error: error.error })))
			}
		}
		if (errors.length) return err(errors)
		return this.validateBaseSync(v, opts)
	}
}

export function record<T>(memberType: Type<T>): RecordType<T> {
	return new RecordType(memberType)
}

// vim: ts=4
