const config = {
	preset: 'ts-jest/presets/default-esm',
	extensionsToTreatAsEsm: ['.ts'],
	testEnvironment: 'node',
	moduleNameMapper: {
		'^(\\.{1,2}/.*)\\.js$': '$1',
	},
}

export default config

// vim: ts=4
