import { Result, ok, err, isOk, isErr } from './utils.js'
import { Type, DecoderOpts, RTError, error } from './type.js'

type ElementType<T extends ReadonlyArray<unknown>> = T extends ReadonlyArray<infer ElementType> ? ElementType : never

// Union //
///////////
class UnionType<T extends ReadonlyArray<unknown>> extends Type<ElementType<T>> {
	members: { [K in keyof T]: Type<T[K]> }

	constructor(members: { [K in keyof T]: Type<T[K]> }) {
		super()
		this.members = members
	}

	print() {
		return this.members.map(member => member.print()).join(' | ')
	}

	decode(u: unknown, opts: DecoderOpts): Result<ElementType<T>, RTError> {
		let errors: string[] = []

		for (const m of this.members) {
			const matched = m.decode(u, opts)
			if (isOk(matched)) {
				return matched as Result<ElementType<T>, RTError>
			}
		}
		return error(`non of the union type members matched`)
	}

	async validate(v: ElementType<T>, opts: DecoderOpts) {
		for (const m of this.members) {
			const matched = m.decode(v, opts)
			if (isOk(matched)) {
				const res = await m.validate(matched.ok, opts)
				return isErr(res) ? res : this.validateBase(v, opts)
			}
		}
		return error(`non of the union type members matched`)
	}
}

export function union<T extends ReadonlyArray<unknown>>(...members: { [K in keyof T]: Type<T[K]> }): Type<ElementType<T>> {
	return new UnionType<T>(members)
}

// vim: ts=4
