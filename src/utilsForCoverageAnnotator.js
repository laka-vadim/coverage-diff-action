#!/usr/bin/env node
/* eslint-disable no-console, @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

/**
 * logErrorAndExit
 */
const logErrorAndExit = message => {
    console.error(`❌ ${message}`);
    process.exit(1);
};

const getUncoveredStatements = ({s, statementMap}) =>
    Object.entries(s)
        .filter(([, hits]) => hits === 0)
        .map(([id]) => statementMap[id].start.line);

const getUncoveredBranches = ({b, branchMap}) =>
    Object.entries(b).flatMap(([id, branchHits]) =>
        branchHits
            .map((hits, i) => (hits === 0 ? branchMap[id].locations[i].start.line : null))
            .filter(Boolean),
    );

const getUncoveredFunctions = ({f, fnMap}) =>
    Object.entries(f)
        .filter(([, hits]) => hits === 0)
        .map(([id]) => fnMap[id].decl.start.line);
/**
 * readJSON
 */
const readJSON = filePath => {
    if (!fs.existsSync(filePath)) logErrorAndExit(`Coverage file not found: ${filePath}`);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};
/**
 * Unwraps coverage data if it's nested under a 'data' property
 */
const unwrapTopLevelData = data =>
    Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v?.data ?? v]));
/**
 * Analyze coverage in changed files
 */
const analyzeCoverage = (changedFiles, coverageMap) => {
    let uncoveredCount = 0;
    const results = [];

    changedFiles.forEach(file => {
        const absPath = path.resolve(file);
        const fileCoverage = coverageMap.data[absPath];
        if (!fileCoverage) return;

        const uncovered = {
            statements: getUncoveredStatements(fileCoverage),
            branches: getUncoveredBranches(fileCoverage),
            functions: getUncoveredFunctions(fileCoverage),
        };

        const totalUncovered = Object.values(uncovered).reduce(
            (sum, lines) => sum + lines.length,
            0,
        );

        if (totalUncovered) {
            uncoveredCount += totalUncovered;
            results.push({file, uncovered});
        }
    });

    return {uncoveredCount, results};
};

module.exports = {
    readJSON,
    unwrapTopLevelData,
    analyzeCoverage,
};
