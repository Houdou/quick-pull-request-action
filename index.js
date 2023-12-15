'use strict';

const _ = require('lodash');
const path = require('path');
const uuid = require('uuid');
const core = require('@actions/core');
const github = require('@actions/github');

const gh = require('./client');

async function createFileUpsertPR({
    owner,
    repo,
    base_branch,
    file_path,
    content,
}) {
    const github_token = core.getInput('github_token');
    const octokit = github.getOctokit(github_token).rest;
    const github_client = gh.clients(octokit);

    const now = new Date();

    const filename = path.parse(file_path).base;
    const new_branch = `quick-pr-${now.valueOf()}`;

    // Create branch
    await github_client.branches.createBranchBasedOn({
        owner,
        repo,
        base_branch_name: base_branch,
        new_branch_name: new_branch
    });

    // Update file content with commit
    await github_client.repos.commitFileChangesOnPath({
        owner,
        repo,
        branch: new_branch,
        file_path: file_path,
        content_in_base64: Buffer.from(
            content
        ).toString('base64'),
        commit_message: `:wrench: Sync ${filename} on ${now.toISOString()}`
    });

    // Create PR
    const created_pr = await github_client.pulls.createPullRequestBaseOn(
        {
            owner,
            repo,
            from_branch: new_branch,
            to_branch: base_branch,
            title: `[Skip CI] Quick Pull Request - ${filename} on ${now.toISOString()}`
        }
    );

    return {
        id: (uuid.v4()).replace(/-/g, ''),
        owner,
        repo,
        branch: new_branch,
        pull_request_url: _.get(created_pr, [
            'data',
            'html_url'
        ]),
        created_at: now.toISOString()
    };
}

async function main() {
    const owner = core.getInput('owner');
    const repo = core.getInput('repo');
    const base_branch = core.getInput('base_branch');
    const file_path = core.getInput('file_path');
    const content = core.getInput('content');

    return createFileUpsertPR({
        owner,
        repo,
        base_branch,
        file_path,
        content,
    });
}

main().then(result => {
    core.setOutput('pull_request', result);
}).catch(err => {
    core.setFailed(err.message);
})