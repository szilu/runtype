import type { StructType } from './struct.js'
import { type DecoderOpts, error, type RTError, Type } from './type.js'
import { ok, type Result } from './utils.js'

// KeyOf //
///////////
class KeyOfType<T extends { [K: string]: unknown }> extends Type<keyof T> {
	struct: StructType<T>

	constructor(struct: StructType<T>) {
		super()
		this.struct = struct
	}

	print() {
		return Object.keys(this.struct.props)
			.map((v) => JSON.stringify(v))
			.join(' | ')
	}

	decode(u: unknown, _opts: DecoderOpts) {
		if (typeof u != 'string' || !Object.hasOwn(this.struct.props, u))
			return error(
				`expected ${Object.keys(this.struct.props)
					.map((v) => JSON.stringify(v))
					.join(' | ')}`
			)
		return ok(u as keyof T)
	}

	async validate(v: keyof T, opts: DecoderOpts) {
		return this.validateBase(v, opts)
	}

	validateSync(v: keyof T, opts: DecoderOpts): Result<keyof T, RTError> {
		return this.validateBaseSync(v, opts)
	}

	// Validators
	in(...list: (keyof T)[]) {
		return this.addValidator((v: keyof T) =>
			list.indexOf(v) >= 0
				? ok(v)
				: error(`must be one of [${list.map((l) => JSON.stringify(l)).join(',')}]`)
		)
	}
}

export function keyOf<T extends { [K: string]: unknown }>(struct: StructType<T>): KeyOfType<T> {
	return new KeyOfType(struct)
}

// vim: ts=4
