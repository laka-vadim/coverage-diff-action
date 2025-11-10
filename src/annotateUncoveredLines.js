#!/usr/bin/env node
/* eslint-disable no-console, @typescript-eslint/no-require-imports */
const {execSync} = require('child_process');

const {createCoverageMap} = require('istanbul-lib-coverage');

const {readJSON, unwrapTopLevelData, analyzeCoverage} = require('./utilsForCoverageAnnotator');

const baseBranch = process.env.GITHUB_BASE_REF || 'master';
const currentCoveragePath = './coverage/coverage-final.json';

const coverageMap = createCoverageMap(unwrapTopLevelData(readJSON(currentCoveragePath)));

const changedFiles = execSync(`git diff --name-only origin/${baseBranch}`, {encoding: 'utf8'})
    .split('\n')
    .filter(Boolean)
    .filter(f => /\.([tj])sx?$/.test(f));

if (!changedFiles.length) {
    console.log('ℹ️ No JS/TS files changed.');
    process.exit(0);
}

const {uncoveredCount, results} = analyzeCoverage(changedFiles, coverageMap);

const runAnnotation = () => {
    results.forEach(({file, uncovered}) => {
        console.log(`\n📄 ${file}`);
        Object.entries(uncovered).forEach(([type, lines]) => {
            lines.forEach(line => {
                console.log(`::warning file=${file},line=${line}::Uncovered ${type} at line ${line}`);
            });
        });
    });

    if (uncoveredCount === 0) {
        console.log('✅ No uncovered lines, branches, or functions found in changed files.');
    } else {
        console.log(`⚠️ Found ${uncoveredCount} uncovered code elements.`);
    }
};

module.exports = { runAnnotation };
