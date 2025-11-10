const {
  readFile,
} = require("fs/promises");
const core = require("@actions/core");
const github = require("@actions/github");

const { computeDiff } = require("./diff");
const { addComment, deleteExistingComments } = require("./comment");
const { runAnnotation } = require("./annotateUncoveredLines");

const { context } = github;
core.info(`Ready...`);

async function parseCoverageFile(filename) {
  const input = JSON.parse(await readFile(filename, "utf8"));
  core.info('Replace path in report...');
  core.info(context.repo.repo);

  return Object.keys(input).reduce((acc, key) => {
    const pathRelativeRepo = new RegExp(`(${context.repo.repo})(.+)`)
    const newKey = key === "total" ? key : key.match(pathRelativeRepo)[0];
    acc[newKey] = input[key];
    return acc;
  }, {});
}

async function run() {
  const githubToken = core.getInput("github-token");
  const baseSummaryFilename = core.getInput("base-summary-filename");
  const coverageFilename = core.getInput("coverage-filename");
  const octokit = github.getOctokit(githubToken);

  core.info(`Annotate uncovered lines..`);
  runAnnotation();

  core.info(`Parsing input files...`);
  const head = await parseCoverageFile(coverageFilename);
  const base = await parseCoverageFile(baseSummaryFilename);
  const allowedToFail = core.getBooleanInput("allowed-to-fail");


  core.info(`Computing diff between base and head coverage reports...`);
  const diff = computeDiff(base, head, { allowedToFail });

  const issue_number = context?.payload?.pull_request?.number;

  if (issue_number) {
    core.info(`Posting a comment on PR...`);
    await deleteExistingComments(octokit, context.repo, issue_number);
    await addComment(octokit, context.repo, issue_number, diff.markdown);

  } else {
    core.info(`Logging diff...`);
    core.info(diff.results);
  }

  if (!allowedToFail && diff.regression) {
    throw new Error("Total coverage is lower than the master branch");
  }
}

try {
  run();
} catch (error) {
  core.setFailed(error.message);
}
