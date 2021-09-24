import * as github from '@actions/github';
import { ghIssueCommentData, ghPullRequestCommentData } from './types';

const debug: string | boolean = process.env.GITHUB_API_DEBUG || true;
const githubToken: string | undefined = process.env.GITHUB_TOKEN;
const octokit = githubToken && github.getOctokit(githubToken);

/**
 * Add comment to issue discussion (link to trello board)
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
 * Add comment to PR discussion (link to trello board)
 */
const addPullRequestComment = async ({
  comment,
  pullNumber,
  repoOwner,
  repoName,
}: ghPullRequestCommentData): Promise<boolean> => {
  if (!octokit) {
    console.error('Octokit is not defined.');
    !githubToken && console.error('GITHUB_TOKEN is falsy.');
    return false;
  }
  if (debug) {
    console.debug('GH api / addPullRequestComment', {
      pullNumber: pullNumber,
      repoOwner: repoOwner,
      repoName: repoName,
    });
  }

  const commentData = {
    body: comment,
    pull_number: pullNumber,
    owner: repoOwner,
    repo: repoName,
  };

  if (debug) {
    console.log('commentData:', JSON.stringify(commentData, undefined, 2));
  }

  const response = await octokit.rest.pulls.createReviewComment(commentData);

  if (debug) {
    console.log('response: ', typeof response, ' ', JSON.stringify(response, undefined, 2));
  }
  if (!response) {
    console.error(`Octokit addPullRequestComment() error with this issue. Data used:`, commentData);
    return false;
  }

  return true;
};

export { addIssueComment, addPullRequestComment };
