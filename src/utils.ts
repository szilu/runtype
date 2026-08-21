// Result type //
/////////////////
export interface Ok<T> {
	readonly ok: T
}

export interface Err<E = string> {
	readonly err: E
}

export type Result<T = undefined, E = string> = Ok<T> | Err<E>

export function ok<T>(t: T): Ok<T> {
	return { ok: t }
}

export function err<E>(error: E): Err<E> {
	return { err: error }
}

export function isOk<T, E>(r: Result<T, E>): r is Ok<T> {
	return 'ok' in r
}

export function isErr<E>(r: Result<unknown, E>): r is Err<E> {
	return 'err' in r
}

// TS helpers //
////////////////
export type OptionalKeys<T> = Exclude<
	{ [P in keyof T]: undefined extends T[P] ? P : never }[keyof T],
	undefined
>
export type RequiredKeys<T> = Exclude<
	{ [P in keyof T]: undefined extends T[P] ? never : P }[keyof T],
	undefined
>
export type RequireFields<T> = { [K in RequiredKeys<T>]: T[K] } & {
	[K in OptionalKeys<T>]-?: T[K] | undefined
}

// vim: ts=4
