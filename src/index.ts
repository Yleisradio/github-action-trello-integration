import * as core from '@actions/core';
import * as github from '@actions/github';

import {
  getLabelsOfBoard,
  getMembersOfBoard,
  getCardsOfList,
  createCard,
  updateCard,
  getCardAttachments,
  addUrlSourceToCard,
  cardParams,
} from './api';
import { TrelloAttachment, TrelloCard } from './types';

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

if (debug) {
  console.log(`Selected action (input from workflow) is ${action}`);
  console.log({ github: JSON.stringify(github) });
  // console.log({ github: JSON.stringify(github, undefined, 2) });
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
  if (debug) {
    console.log(
      JSON.stringify(
        {
          function: 'issueOpenedCreateCard()',
          issue: issue,
          githubContext: github.context,
          issueEventName: issueEventName,
          issueNumber: issueNumber,
          issueTitle: issueTitle,
          issueBody: issueBody,
          issueUrl: issueUrl,
          issueAssigneeNicks: issueAssigneeNicks,
          issueLabelNames: issueLabelNames,
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
    const intersection = trelloLabels.filter((label) => issueLabelNames.includes(label.name));
    const matchingLabelIds = intersection.map((trelloLabel) => trelloLabel.id);
    trelloLabelIds.push(...matchingLabelIds);
  });

  const getMembers = getMembersOfBoard().then((trelloMembers) => {
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
    } as unknown as cardParams;

    console.log(`Creating new card to ${listId} from issue  "[#${issueNumber}] ${issueTitle}"`);

    createCard(listId, params).then((response) => {
      if (debug)
        console.log(
          `createCard got response:`,
          `Card created: [#${issueNumber}] ${issueTitle}`,
          JSON.stringify(response, undefined, 2),
        );
    });
  });
}

function pullRequestEventMoveCard() {
  const eventName: string = github.context.eventName;
  const pullRequest = ghPayload.pull_request;

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
    if (syncMembers) {
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
    }
  });

  const cardsToBeMoved = getCardsOfList(sourceList).then((cardsOnList) => {
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
      updateCard(card.id, params).then((trelloCard: TrelloCard) => {
        getCardAttachments(trelloCard.id).then((cardAttachments: TrelloAttachment[]) => {
          console.log(
            'getCardAttachments response: ',
            JSON.stringify(cardAttachments, undefined, 2),
          );
          const cardsWithRepoReference = cardAttachments.filter((cardAttachment) =>
            cardAttachment.url.substr(0),
          );
        });
        addUrlSourceToCard(card.id, pullRequest?.html_url || '');
      });
    });
  });
}
