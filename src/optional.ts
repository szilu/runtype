import { Result, ok, err, isOk, isErr } from './utils.js'
import { Type, DecoderOpts, RTError } from './type.js'

// Optional //
//////////////
class OptionalType<T> extends Type<T | undefined> {
	type: Type<T>

	constructor(type: Type<T>) {
		super()
		this.type = type
	}

	print() {
		return this.type.print() + ' | undefined'
	}

	decode(u: unknown, opts: DecoderOpts): Result<T | undefined, RTError> {
		if (u === undefined) return ok(undefined)
		const res = this.type.decode(u, opts)
		return isOk(res) ? res : err(res.err)
	}

	async validate(v: T | undefined, opts: DecoderOpts) {
		if (v === undefined) return ok(undefined)
		const res = await this.type.validate(v, opts)
		return isErr(res) ? res : this.validateBase(v, opts)
	}
}

export function optional<T>(type: Type<T>): OptionalType<T> {
	return new OptionalType(type)
}

// vim: ts=4
