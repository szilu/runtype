import { Result, ok, err, isOk, isErr } from './utils'
import { Type, DecoderOpts, RTError } from './type'

// Nullable //
//////////////
class NullableType<T> extends Type<T | null | undefined> {
	type: Type<T>

	constructor(type: Type<T>) {
		super()
		this.type = type
	}

	print() {
		return this.type.print()
			+ (isOk(this.type.decode(null, {})) ? '' : ' | null')
			+ (isOk(this.type.decode(undefined, {})) ? '' : ' | undefined')
	}

	decode(u: unknown, opts: DecoderOpts) {
		if (u === null || u === undefined) return ok(u)
		const res = this.type.decode(u, opts)
		return isOk(res) ? res : err(res.err)
	}

	async validate(v: T | null | undefined, opts: DecoderOpts) {
		if (v === null || v === undefined) return ok(v)
		const res = await this.type.validate(v, opts)
		return isErr(res) ? res : this.validateBase(v, opts)
	}
}

export function nullable<T>(type: Type<T>): NullableType<T> {
	return new NullableType(type)
}

// vim: ts=4
