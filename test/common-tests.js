/* global expect */
const yargs = require('yargs')

const commandModuleExportsObject = (yargsModule, commandGroup, command) => {
	test(`The "${commandGroup} ${command}" command module exports an object that can be used by yargs`, () => {
		expect(yargsModule).toEqual(
			expect.objectContaining({
				command: expect.stringContaining(command),
				desc: expect.any(String),
				builder: expect.any(Function),
				handler: expect.any(Function),
			})
		)
	})
}
const commandModuleCanLoad = (yargsModule, commandGroup, command) => {
	test(`yargs can load the "${commandGroup} ${command}" command without any errors or warnings`, () => {
		expect(() => {
			yargs.command(yargsModule).argv
		}).not.toThrow()
		expect(console.warn).not.toBeCalled()
	})
}

/**
 * When testing <positional> vs. --optional arguments, positional arguments need to be at the beginning.
 * @param {object} requiredArguments
 */
const getTestArguments = requiredArguments => {
	const testArguments = []
	if (requiredArguments.positionals) {
		Object.keys(requiredArguments.positionals).forEach(argument =>
			testArguments.push({
				[argument]: requiredArguments.positionals[argument],
			})
		)
	}
	if (requiredArguments.options) {
		Object.keys(requiredArguments.options).forEach(argument =>
			testArguments.push({
				[argument]: `--${argument} ${requiredArguments.options[argument]}`,
			})
		)
	}
	return testArguments
}
/**
 * Test that each required argument will throw the expected error if it is missing.
 * @param {object} requiredArguments
 * @param {string} commandGroup
 * @param {string} command
 */
const missingOptionWillThrow = (requiredArguments, commandGroup, command) => {
	const testArguments = getTestArguments(requiredArguments)
	testArguments.forEach(argument => {
		const argumentName = Object.keys(argument)[0]
		test(`Running the command handler without ${argumentName} throws an error`, async () => {
			expect.assertions(1)
			try {
				const argumentString = testArguments
					.filter(a => Object.keys(a)[0] != argumentName)
					.map(a => Object.values(a)[0])
					.join(' ')

				/**
				 * Note: execSync() spawns a new process that nocks and mocks do not have access to.
				 * So you can only test for errors.
				 * If you test for successful execution, it will actually try to connect to GitHub.
				 */
				require('child_process').execSync(`./bin/github.js ${commandGroup} ${command} ${argumentString}`)
			} catch (error) {
				expect(error.message).toMatch(new RegExp(`Missing required argument: ${argumentName}`, 'i'))
			}
		})
	})
}
const describeYargs = (yargsModule, commandGroup, command, requiredArguments) => {
	jest.spyOn(global.console, 'warn')
	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('Yargs', () => {
		commandModuleExportsObject(yargsModule, commandGroup, command)
		commandModuleCanLoad(yargsModule, commandGroup, command)
		missingOptionWillThrow(requiredArguments, commandGroup, command)
	})
}
module.exports = {
	describeYargs,
}
