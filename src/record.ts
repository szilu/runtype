import { copyValidators, type DecoderOpts, error, type RTError, Type } from './type.js'
import { err, isErr, isOk, ok, type Result } from './utils.js'

// Record //
////////////
export class RecordType<T> extends Type<Record<string, T>> {
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

		if (typeof u != 'object' || Object.prototype.toString.call(u) != '[object Object]')
			return error('expected Record')

		for (const k in u) {
			if (Object.hasOwn(u, k)) {
				const res = this.memberType.decode((u as { [key: string]: unknown })[k], opts)
				if (isOk(res)) {
					ret[k] = res.ok
				} else {
					errors.push(
						...res.err.map((error) => ({
							path: ['' + k, ...error.path],
							error: error.error
						}))
					)
				}
			}
		}

		if (errors.length) return err(errors)
		return ok(ret)
	}

	async validate(
		v: Record<string, T>,
		opts: DecoderOpts
	): Promise<Result<Record<string, T>, RTError>> {
		const errors: RTError = []

		for (const k in v) {
			if (!Object.hasOwn(v, k)) continue
			const res = await this.memberType.validate(v[k], opts)
			if (isErr(res)) {
				errors.push(
					...res.err.map((error) => ({
						path: ['' + k, ...error.path],
						error: error.error
					}))
				)
			}
		}
		if (errors.length) return err(errors)
		return this.validateBase(v, opts)
	}

	validateSync(v: Record<string, T>, opts: DecoderOpts): Result<Record<string, T>, RTError> {
		this.checkSync()
		const errors: RTError = []

		for (const k in v) {
			if (!Object.hasOwn(v, k)) continue
			const res = this.memberType.validateSync(v[k], opts)
			if (isErr(res)) {
				errors.push(
					...res.err.map((error) => ({
						path: ['' + k, ...error.path],
						error: error.error
					}))
				)
			}
		}
		if (errors.length) return err(errors)
		return this.validateBaseSync(v, opts)
	}

	deepMap(fn: (t: Type<unknown>) => Type<unknown>): Type<unknown> {
		return copyValidators(
			this,
			record(fn(this.memberType as Type<unknown>))
		) as unknown as Type<unknown>
	}
}

export function record<T>(memberType: Type<T>): RecordType<T> {
	return new RecordType(memberType)
}

// vim: ts=4
