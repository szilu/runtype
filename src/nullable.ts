import { Result, ok, err, isOk } from './utils'
import { Type, DecoderOpts, DecoderError, decoderError } from './type'

// Nullable //
//////////////
class NullableType<T> extends Type<T | null | undefined> {
	type: Type<T>

	constructor(type: Type<T>) {
		super()
		this.type = type
	}

	print() {
		return this.type.print() + ' | null | undefined'
	}

	decode(u: unknown, opts: DecoderOpts) {
		if (u === null || u === undefined) return ok(u)
		const res = this.type.decode(u, opts)
		return isOk(res) ? res : err(res.err)
	}
}

export function nullable<T>(type: Type<T>): NullableType<T> {
	return new NullableType(type)
}

// vim: ts=4
