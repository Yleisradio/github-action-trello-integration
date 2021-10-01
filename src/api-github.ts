import * as github from '@actions/github';
import { ghIssueCommentData, ghIssueData } from './types';

const debug: string | boolean = process.env.GITHUB_API_DEBUG || true;
const githubToken: string | undefined = process.env.GITHUB_TOKEN;
const octokit = githubToken && github.getOctokit(githubToken);

/**
 * Add comment to issue discussion (link to trello board).
 *
 * PRs do not have their own endpoint for the same feature but this one is used for them as well.
 * @see https://octokit.github.io/rest.js/v18#issues-create-comment
 * @see https://octokit.github.io/rest.js/v18#pulls-create-review-comment
 *
 */
const addIssueComment = async ({
  comment,
  issueNumber,
  repoOwner,
  repoName,
}: ghIssueCommentData): Promise<boolean> => {
  if (!octokit) {
    console.error('Octokit is not defined.');
    !githubToken && console.error('GITHUB_TOKEN is falsy.');
    return false;
  }

  if (debug) {
    console.debug('GH api / addIssueComment', {
      issueNumber: issueNumber,
      repoOwner: repoOwner,
      repoName: repoName,
    });
  }

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
};

/**
 * REST endpint to get all Issue (or PR) comments.
 *
 * @see https://docs.github.com/en/rest/reference/issues#list-issue-comments-for-a-repository
 */
const getAllIssueComments = async ({ issueNumber, repoOwner, repoName }: ghIssueData) => {
  if (!octokit) {
    console.error('Octokit is not defined.');
    !githubToken && console.error('GITHUB_TOKEN is falsy.');
    return [];
  }
  const ghIssueData = {
    owner: repoOwner,
    repo: repoName,
    issue_number: issueNumber,
  };

  const issueComments = await octokit.rest.issues.listComments(ghIssueData);

  if (debug) {
    console.log(`getAllIssueComments with issue ${issueNumber}: `);
    console.log(JSON.stringify(issueComments, null, 2));
  }

  return issueComments.data || [];
};

export { addIssueComment, getAllIssueComments };
