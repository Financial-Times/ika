const flow = require('lodash.flow');

const github = require("../lib/github");
const { withToken, withJson } = require("../lib/helpers/yargs/options");
const printOutput = require("../lib/helpers/print-output");

/**
 * yargs builder function.
 *
 * @param {import('yargs').Yargs} yargs - Instance of yargs
 */
const builder = yargs => {
	const baseOptions = flow([withToken, withJson]);

	return baseOptions(yargs)
		.option("org", {
			alias: "o",
			describe: "Organization",
			type: "boolean"
		})
		.option("repo", {
			alias: "r",
			describe: "Repository",
			type: "boolean"
		})
		.option("user", {
			alias: "u",
			describe: "GitHub username",
			type: "boolean"
		})
		.conflicts({
			org: ["repo", "user"],
			repo: ["org", "user"],
			user: ["org", "repo"]
		})
		.check(function (argv) {
			if (!argv.org && !argv.repo && !argv.user) {
				throw new Error(
					'Organisation (--org), repository (--repo) or a GitHub username (--user) option must provided'
				);
			}

			return true;
		});
};

/**
 * Create an organisation, repository or user project with columns.
 *
 * @param {object} argv - argv parsed and filtered by yargs
 * @param {string} argv.token
 * @param {boolean} argv.org
 * @param {boolean} argv.repo
 * @param {boolean} argv.user
 * @param {string} argv.target
 * @param {string} argv.name
 * @param {string} [argv.description]
 * @param {string} argv.json
 */
const handler = async ({ token, org, repo, user, target, name, description, json }) => {
	const createProjectError = error => {
		throw new Error(`Creating a project failed. Response: ${error}.`);
	};

	const { createProject, createProjectColumn } = github({
		personalAccessToken: token
	});

	const project = await createProject({
		org,
		repo,
		user,
		target,
		name,
		description
	}).catch(createProjectError);

	const toDoColumn = await createProjectColumn({
		project_id: project.id,
		name: "To do"
	}).catch(createProjectError);

	const inProgressColumn = await createProjectColumn({
		project_id: project.id,
		name: "In progress"
	}).catch(createProjectError);

	const doneColumn = await createProjectColumn({
		project_id: project.id,
		name: "Done"
	}).catch(createProjectError);

	const projectWithColumns = {
		project: project,
		columns: {
			todo: toDoColumn,
			doing: inProgressColumn,
			done: doneColumn
		},
		html_url: project.html_url
	};

	printOutput({ json, resource: projectWithColumns });
};

module.exports = {
	command: "projects:create <target> <name> [description]",
	desc: "Create a new project",
	builder,
	handler
};
