import { Result, ok, err, isOk, isErr, RequiredKeys, OptionalKeys } from './utils'

// Validator class //
/////////////////////
export type Validator<T = unknown> = (value: T) => boolean | Promise<boolean>

export class ValidatorBase<T = unknown> {
	parent?: ValidatorBase<T>
	validate: Validator<T> = (value: T) => true

	constructor(validate: Validator<T>, parent?: ValidatorBase<T>) {
		this.parent = parent
		this.validate = validate
	}

	compose(): Validator<T> {
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

	validator(v: T, next?: Validator<T>) {
		return (!next || next(v)) && this.validate(v)
	}

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
		return new NumberValidator((v: number) => v >= min)
	}

	max(min: number) {
		return new NumberValidator((v: number) => v <= min)
	}
}

export class StringValidator extends ValidatorBase<string> {
	length(len: number) {
		return new StringValidator((v: string) => v.length === len)
	}

	minLength(len: number) {
		return new StringValidator((v: string) => v.length >= len)
	}

	maxLength(len: number) {
		return new StringValidator((v: string) => v.length <= len)
	}

	in(list: string[]) {
		return new StringValidator((v: string) => list.indexOf(v) >= 0)
	}

	matches(pattern: RegExp) {
		return new StringValidator((v: string) => pattern.test(v))
	}

	email() {
		return this.matches(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)
	}
}

export class BooleanValidator extends ValidatorBase<boolean> {
	true() {
		return new BooleanValidator((v: boolean) => v)
	}

	false() {
		return new BooleanValidator((v: boolean) => !v)
	}
}

export class DateValidator extends ValidatorBase<string> {
	min(min: Date = new Date()) {
		return new DateValidator((v: string) => Date.parse(v) >= min.valueOf())
	}

	max(max: Date = new Date()) {
		return new DateValidator((v: string) => Date.parse(v) <= max.valueOf())
	}
}

export const V = {
	number: function number() {
		return new NumberValidator((v: number) => (typeof v === 'number' && !Number.isNaN(v)))
	},

	string: function string() {
		return new StringValidator((v: string) => typeof v === 'string')
	},

	boolean: function boolean() {
		return new BooleanValidator((v: boolean) => typeof v === 'boolean')
	},

	date: function date() {
		return new DateValidator((v: string) => typeof v === 'string' && !Number.isNaN(Date.parse(v)))
	}
}

// vim: ts=4
