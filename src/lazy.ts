import { Result } from './utils.js'
import { Type, DecoderOpts, RTError } from './type.js'

// Lazy //
//////////
class LazyType<T> extends Type<T> {
	def: () => Type<T>
	type?: Type<T>

	constructor(def: () => Type<T>) {
		super()
		this.def = def
	}

	print() {
		if (!this.type) this.type = this.def()
		return this.type.print()
	}

	decode(u: unknown, opts: DecoderOpts): Result<T, RTError> {
		if (!this.type) this.type = this.def()
		console.log('lazy', this.type)
		return this.type.decode(u, opts)
	}

	async validate(v: T, opts: DecoderOpts) {
		if (!this.type) this.type = this.def()
		return await this.type.validate(v, opts)
	}
}

export function lazy<T>(def: () => Type<T>): LazyType<T> {
	return new LazyType(def)
}

// vim: ts=4
