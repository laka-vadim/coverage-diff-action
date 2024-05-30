const {
  readFile,
} = require("fs/promises");
const { existsSync } = require("fs");
const path = require("path");
const core = require("@actions/core");
const github = require("@actions/github");

const { computeDiff } = require("./diff");
const { addComment, deleteExistingComments } = require("./comment");

const { context } = github;
core.info(`Ready...`);

async function run() {
  const githubToken = core.getInput("github-token");
  const baseSummaryFilename = core.getInput("base-summary-filename");
  const coverageFilename = core.getInput("coverage-filename");
  const octokit = github.getOctokit(githubToken);

  core.info(`Parsing input files...`);
  const head = JSON.parse(await readFile(coverageFilename, "utf8"));
  const base = JSON.parse(await readFile(path.join(baseSummaryFilename), "utf8"));
  const allowedToFail = core.getBooleanInput("allowed-to-fail");


  core.info(`Computing diff between base and head coverage reports...`);
  const diff = computeDiff(base, head, { allowedToFail });

  const issue_number = context?.payload?.pull_request?.number;


  core.info(`Posting a comment on PR...`);
  if (issue_number) {
    core.info(`Posting a comment on PR...`);
    await deleteExistingComments(octokit, context.repo, issue_number);
    await addComment(octokit, context.repo, issue_number, diff.markdown);

  } else {
    core.info(`Logging diff...`);
    core.info(diff.results);
  }

  if (!allowedToFail && diff.regression) {
    throw new Error("Total coverage is lower than the default branch");
  }
}

try {
  run();
} catch (error) {
  core.setFailed(error.message);
}
