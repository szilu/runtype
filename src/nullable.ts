import { Result, ok, err, isOk } from './utils'
import { Decoder } from './decoder'

// Nullable //
//////////////
class NullableDecoder<T> extends Decoder<T | null | undefined> {
	type: Decoder<T>

	constructor(type: Decoder<T>) {
		super()
		this.type = type
	}

	print() {
		return this.type.print() + ' | null | undefined'
	}

	decode(u: unknown) {
		if (u === null || u === undefined) return ok(u)
		const res = this.type.decode(u)
		return isOk(res) ? res : err(res.err + ' | null | undefined')
	}
}

export function nullable<T>(type: Decoder<T>): NullableDecoder<T> {
	return new NullableDecoder(type)
}

// vim: ts=4
