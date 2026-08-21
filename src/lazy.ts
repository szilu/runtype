import { copyValidators, type DecoderOpts, type RTError, Type } from './type.js'
import { isErr, type Result } from './utils.js'

// Lazy //
//////////
export class LazyType<T> extends Type<T> {
	def: () => Type<T>
	type?: Type<T>
	private _printing = false

	constructor(def: () => Type<T>) {
		super()
		this.def = def
	}

	print(): string {
		if (this._printing) return '...'
		this._printing = true
		try {
			// Resolve into a local so print() has no side effects on this.type
			const type = this.type ?? this.def()
			return type.print()
		} finally {
			this._printing = false
		}
	}

	decode(u: unknown, opts: DecoderOpts): Result<T, RTError> {
		if (!this.type) this.type = this.def()
		return this.type.decode(u, opts)
	}

	async validate(v: T, opts: DecoderOpts): Promise<Result<T, RTError>> {
		if (!this.type) this.type = this.def()
		const res = await this.type.validate(v, opts)
		return isErr(res) ? res : this.validateBase(v, opts)
	}

	validateSync(v: T, opts: DecoderOpts): Result<T, RTError> {
		this.checkSync()
		if (!this.type) this.type = this.def()
		const res = this.type.validateSync(v, opts)
		return isErr(res) ? res : this.validateBaseSync(v, opts)
	}

	// Map on resolution, not now: the whole point of lazy() is that def() may reference a
	// type that does not exist yet (recursive types).
	deepMap(fn: (t: Type<unknown>) => Type<unknown>): Type<unknown> {
		return copyValidators(
			this,
			lazy(() => fn(this.def() as Type<unknown>))
		)
	}
}

export function lazy<T>(def: () => Type<T>): LazyType<T> {
	return new LazyType(def)
}

// vim: ts=4
