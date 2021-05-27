import { Result, ok, err, isOk, isErr, RequiredKeys, OptionalKeys } from './utils'

// Validator class //
/////////////////////
export type ValidatorFunc<T = unknown> = (value: T) => boolean | Promise<boolean>

export interface ValidatorIF<T = unknown> {
	validate: ValidatorFunc<T>
	compose(): ValidatorFunc<T>
}

export type Validator<T> = ValidatorIF<T> | ValidatorFunc<T>

export class ValidatorBase<T = unknown> {
	parent?: ValidatorBase<T>
	validF: ValidatorFunc<T> = (value: T) => true

	constructor(validF: ValidatorFunc<T>, parent?: ValidatorBase<T>) {
		this.parent = parent
		this.validF = validF
	}

	compose(): ValidatorFunc<T> {
		const validateF = this.validate
		if (this.parent) {
			const parentF = this.parent.compose()
			return function validate(v: T) {
				return parentF(v) && validateF(v)
			}
		} else {
			return function validate(v: T) {
				return validateF(v)
			}
		}
	}

	validate(v: T): boolean | Promise<boolean> {
		return (!this.parent || this.parent.validate(v)) && this.validF(v)
	}

	/*
	validator(v: T, next?: ValidatorFunc<T>) {
		return (!next || next(v)) && this.validF(v)
	}
	*/

	in(list: T[]) {
		return Object.create(Object.getPrototypeOf(this), { parent: { value: this }, validate: { value: (v: T) => list.indexOf(v) >= 0 } })
	}
}

export class NumberValidator extends ValidatorBase<number> {
	integer() {
		return new NumberValidator((v: number) => v === Math.round(v), this)
	}

	positive() {
		return new NumberValidator((v: number) => v >= 0, this)
	}

	negative() {
		return new NumberValidator((v: number) => v <= 0, this)
	}

	min(min: number) {
		return new NumberValidator((v: number) => v >= min, this)
	}

	max(min: number) {
		return new NumberValidator((v: number) => v <= min, this)
	}
}

export class StringValidator extends ValidatorBase<string> {
	length(len: number) {
		return new StringValidator((v: string) => v.length === len, this)
	}

	minLength(len: number) {
		return new StringValidator((v: string) => v.length >= len, this)
	}

	maxLength(len: number) {
		return new StringValidator((v: string) => v.length <= len, this)
	}

	in(list: string[]): StringValidator {
		return new StringValidator((v: string) => list.indexOf(v) >= 0, this)
	}

	matches(pattern: RegExp) {
		return new StringValidator((v: string) => pattern.test(v), this)
	}

	email() {
		return this.matches(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)
	}
}

export class BooleanValidator extends ValidatorBase<boolean> {
	true() {
		return new BooleanValidator((v: boolean) => v, this)
	}

	false() {
		return new BooleanValidator((v: boolean) => !v, this)
	}
}

export class DateValidator extends ValidatorBase<string> {
	min(min: Date = new Date()) {
		return new DateValidator((v: string) => Date.parse(v) >= min.valueOf(), this)
	}

	max(max: Date = new Date()) {
		return new DateValidator((v: string) => Date.parse(v) <= max.valueOf(), this)
	}
}

// tslint:disable:strict-type-predicates
export function number() {
	return new NumberValidator((v: number) => (typeof v === 'number' && !Number.isNaN(v)))
}

export function string() {
	return new StringValidator((v: string) => typeof v === 'string')
}

export function boolean() {
	return new BooleanValidator((v: boolean) => typeof v === 'boolean')
}

export function date() {
	return new DateValidator((v: string) => typeof v === 'string' && !Number.isNaN(Date.parse(v)))
}
// tslint:enable:strict-type-predicates

// vim: ts=4
