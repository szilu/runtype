import { Result, ok, err, isOk } from './utils'
import { Type, DecoderOpts, RTError, error } from './type'
import { StructType } from './struct'

// KeyOf //
///////////
class KeyOfType<T extends { [K: string]: unknown }> extends Type<keyof T> {
	struct: StructType<T>

	constructor(struct: StructType<T>) {
		super()
		this.struct = struct
	}

	print() {
		return Object.keys(this.struct.props).map(v => JSON.stringify(v)).join(' | ')
	}

	decode(u: unknown, opts: DecoderOpts) {
		if (typeof u != 'string'
			|| !this.struct.props[u]) return error(`expected ${Object.keys(this.struct.props).map(v => JSON.stringify(v)).join(' | ')}`)
		return ok(u as keyof T)
	}

	async validate(v: keyof T, opts: DecoderOpts) {
		return this.validateBase(v, opts)
	}

	// Validators
	//in(...list: Scalar[]) {
	in(...list: (keyof T)[]) {
		return this.addValidator((v: keyof T) => list.indexOf(v) >= 0 ? ok(v)
			: error(`must be one of [${list.map(l => JSON.stringify(l)).join(',')}]`))
	}
}

export function keyOf<T extends { [K: string]: unknown }>(struct: StructType<T>): KeyOfType<T> {
	return new KeyOfType(struct)
}

// vim: ts=4
