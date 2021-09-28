import * as core from '@actions/core';
import { getAllIssueComments } from './api-github';
import { getCardAttachments, getListsOnBoard } from './api-trello';
import { ghIssueData, TrelloCard } from './types';

const verbose: string | boolean = process.env.TRELLO_ACTION_VERBOSE || false;

/**
 * Validate Trello entity id.
 *
 * Trello ID's follow one pattern across all entities (cards, lists, boards).
 *
 * @param {string} id
 *
 * @returns boolean
 */
const validateIdPattern = (id: string) => {
  const matches = id.match(/^[0-9a-fA-F]{24}$/);
  return matches && matches[0] === id;
};

/**
 * Validate Trello list exists on board.
 *
 * @param {string} listId
 *
 * @throws if lists is not on the board.
 */
const validateListExistsOnBoard = (listId: string) => {
  if (!validateIdPattern(listId)) {
    return false;
  }
  return getListsOnBoard().then((listsFromApi) => {
    if (typeof listsFromApi === 'string') {
      core.setFailed(listsFromApi);
      return false;
    }
    const matching = listsFromApi.filter((list) => list.id === listId);
    return matching.length > 0;
  });
};

const boardId = (): string => {
  if (!validateIdPattern(process.env.TRELLO_BOARD_ID || '')) {
    console.log('TRELLO_BOARD_ID pattern does not match the pattern.');
    return '';
  }
  return process.env.TRELLO_BOARD_ID as string;
};

// Check if the PR is already linked from the Card.
// Card has attachments and we are satisfied if the beginning of
// any attachment url matches the public repository URL.
const cardHasPrLinked = (card: TrelloCard, repoHtmlUrl: string) => {
  return getCardAttachments(card.id).then((attachments) => {
    if (typeof attachments === 'string') {
      return false;
    }

    const matchingAttachment = attachments.find((attachment) =>
      attachment.url.startsWith(repoHtmlUrl),
    );
    // One or more attachments is already linking to PR.
    if (typeof matchingAttachment !== 'undefined') {
      return true;
    }
    if (verbose) {
      console.log(`Adding link (attachment) to pull request to the card "${card.name}".`);
    }
    return false;
  });
};

const isIssueAlreadyLinkedTo = (
  findme: string,
  { issueNumber, repoOwner, repoName }: ghIssueData,
): Promise<boolean | void> => {
  return getAllIssueComments({ issueNumber: issueNumber, repoOwner: repoOwner, repoName: repoName })
    .then((comments) => {
      if (!comments || !comments.length) {
        return undefined;
      }
      // TEMP for debugging.
      return undefined;
      // return comments.some((comment) => comment.body && comment.body.match(findme));
    })
    .then((matcher) => {
      return matcher === undefined;
    })
    .catch((error) => {
      console.error(
        'Error locating the provided string in issue/pr comments: ' +
          JSON.stringify(error, null, 2),
      );
    });
};
export {
  validateIdPattern,
  validateListExistsOnBoard,
  boardId,
  cardHasPrLinked,
  isIssueAlreadyLinkedTo,
};
