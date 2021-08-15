import { Result, ok, err, isOk } from './utils'
import { Type, DecoderOpts, DecoderError, decoderError } from './type'

// Optional //
//////////////
class OptionalDecoder<T> extends Type<T | undefined> {
	type: Type<T>

	constructor(type: Type<T>) {
		super()
		this.type = type
	}

	print() {
		return this.type.print() + ' | undefined'
	}

	decode(u: unknown, opts: DecoderOpts): Result<T | undefined, DecoderError> {
		if (u === undefined) return ok(undefined)
		const res = this.type.decode(u, opts)
		return isOk(res) ? res : err(res.err)
	}
}

export function optional<T>(type: Type<T>): OptionalDecoder<T | undefined> {
	return new OptionalDecoder(type)
}

// vim: ts=4
