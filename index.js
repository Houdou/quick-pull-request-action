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
    const octokit = github.getOctokit(github_token);
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
            to_branch: branch,
            title: `[Skip CI] Quick Pull Request - ${filename} on ${now.toISOString()}`
        }
    );

    core.setOutput('pull_request', {
        id: (uuid.v4()).replace(/-/g, ''),
        owner,
        repo,
        new_branch,
        filename,
        pull_request_url: _.get(first_handle_result, [
            'created_pr',
            'data',
            'html_url'
        ]),
        created_at: now.toISOString()
    });
}

async function main() {
    const owner = core.getInput('owner');
    const repo = core.getInput('repo');
    const file_path = core.getInput('file_path');
    const content = core.getInput('content');

    return createFileUpsertPR({
        owner,
        repo,
        file_path,
        content,
    });
}

main().then(result => {
    core.setOutput('result', result);
}).catch(err => {
    core.setFailed(err.message);
})