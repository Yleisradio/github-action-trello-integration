import * as core from '@actions/core';
import * as github from '@actions/github';

import {
  getLabelsOfBoard,
  getMembersOfBoard,
  getCardsOfList,
  createCard,
  updateCard,
  getCardAttachments,
  addAttachmentToCard,
} from './api';
import { TrelloCardRequestParams } from './types';
import { validateListExistsOnBoard } from './utils';

const debug = core.getInput('verbose');
const action = core.getInput('action');
/**
 * GW webhook payload.
 *
 * @see https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#webhook-payload-example-48
 */
const ghPayload: any = github.context.payload;

if (!action) {
  throw Error('Action is not set.');
}

try {
  switch (action) {
    case 'issue_opened_create_card':
      issueOpenedCreateCard();
      break;
    case 'pull_request_event_move_card':
      pullRequestEventMoveCard();
      break;

    default:
      throw Error('Action is not supported: ' + action);
  }
} catch (error) {
  core.setFailed(error as Error);
}

function issueOpenedCreateCard() {
  const issue = ghPayload.issue;
  const issueEventName = github.context.eventName;
  const issueNumber = issue?.number;
  const issueTitle = issue?.title;
  const issueBody = issue?.body;
  const issueUrl = issue?.html_url;
  const issueAssigneeNicks = issue?.assignees.map((assignee: any) => assignee.login);
  const issueLabelNames = issue?.labels.map((label: any) => label.name);
  const repoHtmlUrl = github.context.payload.repository?.html_url;

  if (debug) {
    console.log(
      JSON.stringify(
        {
          function: 'issueOpenedCreateCard()',
          issueEventName: issueEventName,
          issueNumber: issueNumber,
          issueTitle: issueTitle,
          issueBody: issueBody,
          issueUrl: issueUrl,
          issueAssigneeNicks: issueAssigneeNicks,
          issueLabelNames: issueLabelNames,
          githubContext: github.context,
        },
        undefined,
        2,
      ),
    );
  }
  const listId: string = process.env.TRELLO_LIST_ID as string;
  const trelloLabelIds: string[] = [];
  const memberIds: string[] = [];

  if (!validateListExistsOnBoard(listId)) {
    core.setFailed('TRELLO_LIST_ID is not valid.');
    return;
  }

  const getLabels = getLabelsOfBoard().then((trelloLabels) => {
    if (typeof trelloLabels === 'string') {
      core.setFailed(trelloLabels);
      return;
    }
    const intersection = trelloLabels.filter((label) => issueLabelNames.includes(label.name));
    const matchingLabelIds = intersection.map((trelloLabel) => trelloLabel.id);
    trelloLabelIds.push(...matchingLabelIds);
  });

  const getMembers = getMembersOfBoard().then((trelloMembers) => {
    if (typeof trelloMembers === 'string') {
      core.setFailed(trelloMembers);
      return;
    }
    const membersOnBothSides = trelloMembers.filter((member) =>
      issueAssigneeNicks.includes(member.username),
    );
    const matchingMemberIds = membersOnBothSides.map((trelloMember) => trelloMember.id);
    memberIds.push(...matchingMemberIds);
  });

  Promise.all([getLabels, getMembers]).then(() => {
    const params = {
      number: issueNumber,
      title: issueTitle,
      description: issueBody,
      sourceUrl: issueUrl,
      memberIds: memberIds.join(),
      labelIds: trelloLabelIds.join(),
    } as unknown as TrelloCardRequestParams;

    console.log(`Creating new card to ${listId} from issue  "[#${issueNumber}] ${issueTitle}"`);

    createCard(listId, params).then((createdCard) => {
      if (typeof createdCard === 'string') {
        core.setFailed(createdCard);
        return;
      }
      if (!repoHtmlUrl) {
        core.setFailed(
          `Resolving repository URL failed, no backlink set. Check card "${createdCard.name}", URL: ${createdCard.url}.`,
        );
        return;
      }

      if (debug)
        console.log(
          `Card created: "${createdCard.name}"`,
          JSON.stringify(createdCard, undefined, 2),
        );

      addAttachmentToCard(createdCard.id, repoHtmlUrl).then((createdAttachment) => {
        if (typeof createdAttachment === 'string') {
          core.setFailed(createdAttachment);
        }
        if (debug) {
          console.log(
            'Created new card attachment: ',
            JSON.stringify(createdAttachment, undefined, 2),
          );
        }
      });
    });
  });
}

function pullRequestEventMoveCard() {
  const eventName: string = github.context.eventName;
  const pullRequest = ghPayload.pull_request;
  const repoHtmlUrl = github.context.payload.repository?.html_url || 'URL missing in GH payload';

  if (debug) {
    console.log('github', JSON.stringify(github, undefined, 2));
    console.log(
      JSON.stringify(
        {
          prNumber: pullRequest?.number,
          issueEventName: eventName,
          prTitle: pullRequest?.title,
          prBody: pullRequest?.body,
          prUrl: pullRequest?.html_url,
          prAssignees: JSON.stringify(pullRequest?.assignees, undefined, 2),
          prLabelNames: JSON.stringify(pullRequest?.labels, undefined, 2),
        },
        undefined,
        2,
      ),
    );
  }
  const sourceList: string = process.env.TRELLO_SOURCE_LIST_ID as string;
  const targetList: string = process.env.TRELLO_TARGET_LIST_ID as string;
  const syncMembers: string = process.env.TRELLO_SYNC_BOARD_MEMBERS as string;
  const additionalMemberIds: string[] = [];

  if (
    !sourceList ||
    !targetList ||
    !validateListExistsOnBoard(sourceList) ||
    !validateListExistsOnBoard(targetList)
  ) {
    core.setFailed('TRELLO_SOURCE_LIST_ID or TRELLO_TARGET_LIST_ID is invalid.');
    return;
  }

  const getMembers = getMembersOfBoard().then((membersOfBoard) => {
    if (typeof membersOfBoard === 'string') {
      core.setFailed(membersOfBoard);
      return;
    }
    const prReviewers: string[] = pullRequest?.requested_reviewers.map(
      (reviewer: any) => reviewer.login as string,
    );
    const additionalMemberIds: string[] = [];
    prReviewers.forEach((reviewer) => {
      membersOfBoard.forEach((member) => {
        if (member.username == reviewer) {
          console.log('Adding member ' + member.username + ' to the existing card (to be moved)');
          additionalMemberIds.push(member.id);
        }
      });
    });
  });

  const cardsToBeMoved = getCardsOfList(sourceList).then((cardsOnList) => {
    if (typeof cardsOnList === 'string') {
      core.setFailed(cardsOnList);
      return [];
    }
    const referencedIssuesInGh: string[] = pullRequest?.body?.match(/#[1-9][0-9]*/) || [];

    return cardsOnList.filter((card) => {
      const haystack = `${card.name} ${card.desc}`;
      const issueRefsOnCurrentCard = haystack.match(/#[0-9][1-9]*/) || [];
      if (debug) {
        console.log('issueRefsOnCurrentCard', JSON.stringify(issueRefsOnCurrentCard, undefined, 2));
      }
      const crossMatchIssues = issueRefsOnCurrentCard.filter((issueRef) =>
        referencedIssuesInGh.includes(issueRef),
      );
      return crossMatchIssues.length !== 0;
    });
  });

  Promise.all([getMembers, cardsToBeMoved]).then((promiseValues) => {
    const params = {
      destinationListId: targetList,
      memberIds: additionalMemberIds.join(),
    };

    promiseValues[1].forEach((card) => {
      updateCard(card.id, params).then((trelloCard) => {
        if (typeof trelloCard === 'string') {
          core.setFailed(trelloCard);
          return;
        }
        getCardAttachments(trelloCard.id).then((cardAttachments) => {
          if (typeof cardAttachments === 'string') {
            core.setFailed(cardAttachments);
            return;
          }
          if (debug) {
            console.log(
              'getCardAttachments response: ',
              JSON.stringify(cardAttachments, undefined, 2),
            );
          }
          // We wanna touch cards explicitly linked to the current repository.
          const cardsWithRepoReference = cardAttachments.filter((cardAttachment) =>
            cardAttachment.url.startsWith(repoHtmlUrl),
          );
        });
        addAttachmentToCard(card.id, pullRequest?.html_url || '');
      });
    });
  });
}
