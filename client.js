'use strict';

const clients = (octokit) => {
    const branches = {
        createBranchBasedOn: async ({
            owner,
            repo,
            base_branch_name,
            new_branch_name
        }) => {
            // Get base branch reference
            const get_base_branch_reference_response = await octokit.git.getRef(
                {
                    owner,
                    repo,
                    ref: base_branch_name
                        ? `heads/${base_branch_name}`
                        : 'heads'
                }
            );

            const {
                data: {
                    object: {sha: base_branch_sha}
                }
            } = get_base_branch_reference_response;

            await octokit.git.createRef({
                owner,
                repo,
                ref: `refs/heads/${new_branch_name}`,
                sha: base_branch_sha
            });
        }
    };
    const repos = {
        commitFileChangesOnPath: async ({
            owner,
            repo,
            file_path,
            branch,
            content_in_base64,
            commit_message
        }) => {
            try {
                const get_file_content_response = await octokit.repos.getContent(
                    {
                        owner,
                        repo,
                        ref: branch,
                        path: file_path
                    }
                );

                const {
                    data: {
                        // 💩github get content api can respond all contents under a folder
                        // in array format. Therefore, the type is overlapped here...
                        // @ts-ignore
                        sha: file_sha
                    }
                } = get_file_content_response;

                await octokit.repos.createOrUpdateFileContents({
                    owner,
                    repo,
                    path: file_path,
                    message: commit_message,
                    content: content_in_base64,
                    branch,
                    sha: file_sha
                });
            } catch (err) {
                if (err.status !== 404) {
                    throw err;
                }

                // 404 - File doesn't exist, create it without sha param
                await octokit.repos.createOrUpdateFileContents({
                    owner,
                    repo,
                    path: file_path,
                    message: commit_message,
                    content: content_in_base64,
                    branch
                });
            }
        }
    };
    const pulls = {
        createPullRequestBaseOn: async ({
            owner,
            repo,
            title,
            from_branch,
            to_branch
        }) => {
            return octokit.pulls.create({
                owner,
                repo,
                title,
                base: to_branch,
                head: from_branch
            });
        }
    };

    return {
        branches,
        repos,
        pulls
    };
};

module.exports = {clients};
