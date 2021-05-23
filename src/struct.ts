import { Result, ok, err, isOk, isErr, RequiredKeys, OptionalKeys } from './utils'
import { Decoder } from './decoder'

// Struct //
////////////
export class StructDecoder<S> extends Decoder<
	{ [K in RequiredKeys<S>]: S[K] }
	& { [K in OptionalKeys<S>]?: S[K] }
> {
	props: { [K in keyof S]: Decoder<S[K]> }

	constructor(props: { [K in keyof S]: Decoder<S[K]> }) {
		super()
		this.props = props
	}

	print() {
		return '{ '
			+ (Object.keys(this.props) as (keyof S)[]).map(name =>
				`${name}${isOk(this.props[name].decode(undefined)) ? '?' : ''}: ${this.props[name].print()}`
			).join(', ')
			+ ' }'
	}

	checkExtraFields(struct: Record<keyof S, unknown>) {
		let errors: string[] = []
		for (const p of Object.getOwnPropertyNames(struct)) {
			if (!this.props.hasOwnProperty(p)) errors.push(`${p}: unknown field`)
		}
		return errors
	}

	decode(u: unknown): Result<
		{ [K in RequiredKeys<S>]: S[K] }
		& { [K in OptionalKeys<S>]?: S[K] }
	> {
		let errors: string[] = []

		if (typeof u !== 'object' || u === null) {
			return err('expected object')
		}
		const struct: Record<keyof S, unknown> = u as any
		// decode fields
		for (const p in this.props) {
			const res = this.props[p].decode(struct[p])
			if (isErr(res)) errors.push(`${p}: ${res.err}`)
		}
		// check extra fields
		errors.splice(-1, 0, ...this.checkExtraFields(struct))
		if (errors.length) return err(errors.join('\n'))
		return ok(u as { [K in keyof S]: S[K] })
	}

	decodePartial(u: unknown): Result<{ [K in keyof S]?: S[K] | undefined }> {
		let errors: string[] = []

		if (typeof u !== 'object' || u === null) {
			return err('expected object')
		}
		const struct: Record<keyof S, unknown> = u as any
		// decode fields
		for (const p in this.props) {
			const res = (struct[p] as any) === undefined ? ok(undefined) : this.props[p].decode(struct[p])
			if (isErr(res)) errors.push(`${p}: ${res.err}`)
		}
		// check extra fields
		errors.splice(-1, 0, ...this.checkExtraFields(struct))
		if (errors.length) return err(errors.join('\n'))
		return ok(u as { [K in keyof S]: S[K] })
	}

	decodePatch(u: unknown): Result<
		{ [K in RequiredKeys<S>]?: S[K] | undefined }
		& { [K in OptionalKeys<S>]?: S[K] | null | undefined }
	> {
		let errors: string[] = []

		if (typeof u !== 'object' || u === null) {
			return err('expected object')
		}
		const struct: Record<keyof S, unknown> = u as any
		// decode fields
		for (const p in this.props) {
			let res
			if (isOk(this.props[p].decode(undefined))) {
				// optional field => accept undefined and null
				res = (struct[p] as any) === undefined ? ok(undefined)
					: (struct[p] as any) === null ? ok(null)
					: this.props[p].decode(struct[p])
			} else {
				// required field => accept only undefined
				res = (struct[p] as any) === undefined ? ok(undefined)
					: this.props[p].decode(struct[p])
			}
			if (isErr(res)) errors.push(`${p}: ${res.err}`)
		}
		// check extra fields
		errors.splice(-1, 0, ...this.checkExtraFields(struct))
		if (errors.length) return err(errors.join('\n'))
		return ok(u as { [K in RequiredKeys<S>]?: S[K] | undefined } & { [K in OptionalKeys<S>]?: S[K] | null | undefined })
	}
}

export function struct<S>(props: { [K in keyof S]: Decoder<S[K]> }): StructDecoder<S> {
	return new StructDecoder(props)
}

// vim: ts=4
