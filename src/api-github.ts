import * as github from '@actions/github';

const debug: string | boolean = process.env.GITHUB_API_DEBUG || true;

const addIssueComment = async (comment: string): Promise<boolean> => {
  const githubToken: string | undefined = process.env.GITHUB_TOKEN;
  if (githubToken) {
    const octokit = github.getOctokit(githubToken);

    const payload = github.context.payload;
    const issueNumber: number | undefined = Number(payload.issue?.number) || undefined;
    const repoOwner: string | undefined = payload.repository?.owner.name || undefined;
    const repoName: string | undefined = payload.repository?.name;
    if (debug) {
      console.debug('GH api / addIssueComment', {
        issueNumber: issueNumber,
        repoOwner: repoOwner,
        repoName: repoName,
      });
    }
    if (issueNumber && repoOwner && repoName) {
      const commentData = {
        body: comment,
        issue_number: issueNumber,
        owner: repoOwner,
        repo: repoName,
      };
      const response = await octokit.rest.issues.createComment(commentData);
      if (!response) {
        console.error(`Octokit createComment() error with this issue. Data used:`, commentData);
        return false;
      }
      return true;
    }
  }
  return false;
};

export { addIssueComment };
