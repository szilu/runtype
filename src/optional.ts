import { Result, ok, err, isOk } from './utils'
import { Decoder } from './decoder'

// Optional //
//////////////
class OptionalDecoder<T> extends Decoder<T | undefined> {
	type: Decoder<T>

	constructor(type: Decoder<T>) {
		super()
		this.type = type
	}

	print() {
		return this.type.print() + ' | undefined'
	}

	decode(u: unknown): Result<T | undefined> {
		if (u === undefined) return ok(undefined)
		const res = this.type.decode(u)
		return isOk(res) ? res : err(res.err + ' | undefined')
	}
}

export function optional<T>(type: Decoder<T>): OptionalDecoder<T | undefined> {
	return new OptionalDecoder(type)
}

// vim: ts=4
