const fs = require('fs')
const parseGitHubURL = require('./parse-github-url')
const convertToFlattenedArrayOfValues = require('./convert-to-flattened-array-of-values')

const withToken = options => yargs =>
	yargs
		.option(
			'token',
			Object.assign(
				{},
				{
					alias: 't',
					describe: 'GitHub personal access token. \nGenerate one at https://github.com/settings/tokens.',
					type: 'string',
				},
				options
			)
		)
		.check(argv => {
			if (!argv.token && !process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
				throw new Error('Missing required argument: token.')
			}
			return true
		})
		.default('token', process.env.GITHUB_PERSONAL_ACCESS_TOKEN, '$GITHUB_PERSONAL_ACCESS_TOKEN')

const withJson = options => yargs =>
	yargs.option(
		'json',
		Object.assign(
			{},
			{
				alias: 'j',
				describe: 'Format command output as a JSON-formatted string',
				type: 'boolean',
			},
			options
		)
	)

const withBody = options => yargs =>
	yargs
		.option(
			'body',
			Object.assign(
				{},
				{
					alias: 'b',
					describe: 'Path to pull request body',
					type: 'string',
				},
				options
			)
		)
		.check(argv => {
			/**
			 * Sometimes (especially during testing), `process.stdin.isTTY` gives a false negative.
			 * So make sure that '/dev/stdin' can be read. If not, then consider `stdin` to be absent.
			 */
			let hasStdin
			if (!process.stdin.isTTY) {
				try {
					fs.readFileSync('/dev/stdin')
					hasStdin = true
				} catch (error) {
					hasStdin = false
				}
			}
			const describe = 'Choose either to pipe through the body OR pass a file path as the --body argument'
			if (argv.body && hasStdin) {
				throw new Error(`Too many body inputs. ${describe}`)
			}
			if (!argv.body && !hasStdin) {
				throw new Error(`Missing required argument: body. ${describe}`)
			}

			// The --body argument is expected to be a filepath. So give it the path of `stdin` where appropriate.
			if (!argv.body && hasStdin) {
				argv.body = '/dev/stdin'
			}

			// Confirm that the required file exists
			if (!fs.existsSync(argv.body)) {
				throw new Error(`File not found: ${argv.body}`)
			}
			return true
		}, options)
		.middleware(argv => {
			// Load the content of the file indicated by `argv.body` and make it available as argv.bodyContent.
			try {
				argv.bodyContent = fs.readFileSync(argv.body, 'utf8')
			} catch (error) {
				argv.bodyContent = ''
			}
		})

const withBase = options => yargs =>
	yargs.option(
		'base',
		Object.assign(
			{},
			{
				describe: 'Base branch',
				type: 'string',
				default: 'master',
			},
			options
		)
	)

const withTitle = options => yargs =>
	yargs.option(
		'title',
		Object.assign(
			{},
			{
				describe: 'Pull request title',
				type: 'string',
			},
			options
		)
	)

const withReviewers = options => yargs =>
	yargs.option(
		'reviewers',
		Object.assign(
			{},
			{
				describe: 'One or more GitHub *user* account names.',
				type: 'array',
			},
			options
		)
	)

const withTeamReviewers = options => yargs =>
	yargs.option(
		'team-reviewers',
		Object.assign(
			{},
			{
				describe: 'One or more GitHub *team* account names.',
				type: 'array',
			},
			options
		)
	)

const withGitHubUrl = options => yargs => {
	return (
		yargs
			.positional(
				'github-url',
				Object.assign(
					{},
					{
						describe: 'A GitHub URL. Pattern: [https://][github.com]/[scope]/[owner]/[repository]/[endpoint]/[value]',
						type: 'string',
					},
					options
				)
			)
			/**
			 * Coerce properties from GitHub URLs.
			 */
			.coerce('github-url', parseGitHubURL)
			/**
			 * Give an appropriate error message for <github-url>
			 */
			.fail((message, error, yargs) => {
				yargs.showHelp()
				if (message.includes('Not enough non-option arguments')) {
					console.error('Missing required argument: github-url.')
				} else {
					console.error(message)
				}
				process.exit(1)
			})
	)
}

const withTopics = options => yargs => {
	return yargs
		.option(
			'topics',
			Object.assign(
				{
					alias: ['topic'],
					type: 'string',
					describe: 'GitHub topics to add. To add more than one, add multiple options or a comma separated list',
				},
				options
			)
		)
		.coerce('topic', convertToFlattenedArrayOfValues)
}

module.exports = {
	withToken,
	withJson,
	withBase,
	withBody,
	withTitle,
	withReviewers,
	withTeamReviewers,
	withGitHubUrl,
	withTopics,
}
