import { Result, err } from './utils'

/////////////
// Decoder //
/////////////
export abstract class Decoder<T> {
	abstract print(): string
	abstract decode(u: unknown): Result<T>
}

export type TypeOf<D> = D extends { decode: (u: unknown) => Result<infer T> } ? T : never
export type PartialTypeOf<D> = D extends { decodePartial: (u: unknown) => Result<infer T> } ? T : never
export type PatchTypeOf<D> = D extends { decodePatch: (u: unknown) => Result<infer T> } ? T : never

// vim: ts=4
