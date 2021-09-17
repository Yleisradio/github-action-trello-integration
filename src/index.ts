import * as core from '@actions/core';
import * as github from '@actions/github';
import { WebhookPayload } from '@actions/github/lib/interfaces';
import { PushEvent } from '@octokit/webhooks-definitions/schema';

import {
  getLabelsOfBoard,
  getMembersOfBoard,
  getCardsOfList,
  createCard,
  updateCard,
  getCardAttachments,
  addUrlSourceToCard,
} from './api';

import { validateListExistsOnBoard, boardId } from './utils';

const trelloBoard: string = boardId();

var debug: string = '';
var action: string = '';
try {
  action = core.getInput('action');
  if (!action) {
    throw Error('Action is not set.');
  }

  if (debug) {
    console.log(`Selected action is ${action}`);
  }
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
  console.trace();
}

function issueOpenedCreateCard() {
  const pushPayload: PushEvent = github.context.payload as any as PushEvent;
  core.info(`The head commit is: ${pushPayload.head_commit}`);

  let issue, issueEventName;
  try {
    issue = github.context.payload.issue;
    issueEventName = github.context.eventName;
  } catch (error) {
    console.log('github', JSON.stringify(github, undefined, 2));
    console.log(error);
    console.trace();
  }
  const issueNumber = issue?.number;
  const issueTitle = issue?.title;
  const issueBody = issue?.body;
  const issueUrl = issue?.html_url;
  const issueAssigneeNicks = issue?.assignees.map((assignee) => assignee.login);
  const issueLabelNames = issue?.labels.map((label) => label.name);
  if (debug) {
    console.log(
      JSON.stringify(
        {
          issueNumber: issueNumber,
          issueEventName: issueEventName,
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
  try {
    const listId: string = process.env.TRELLO_LIST_ID as string;
    validateListExistsOnBoard(listId);
  } catch (error) {
    core.setFailed(error as Error);
    return;
  }
  let trelloLabelIds: string[] = [];
  let memberIds: string[] = [];

  const labels = getLabelsOfBoard().then(function (response) {
    const trelloLabels = response;
    trelloLabels.filter((trelloLabel) => issueLabelNames.indexof(trelloLabel.name) !== -1);
    trelloLabelIds.push(trelloLabels.map((label) => label.id));
  });

  const members = getMembersOfBoard(trelloBoard).then(function (response) {
    const members = response;
    members.filter((member) => issueAssigneeNicks.indexof(member.username) !== -1);
    memberIds.push(members.map((member) => member.id));
  });

  Promise.all([labels, members]).then(() => {
    const cardParams = {
      number: issueNumber,
      title: issueTitle,
      description: issueBody,
      sourceUrl: issueUrl,
      memberIds: memberIds.join(),
      labelIds: trelloLabelIds.join(),
    };

    createCard(listId, cardParams).then((response) => {
      if (debug)
        console.log(
          `createCard got response:`,
          `Card created: [#${issueNumber}] ${issueTitle}`,
          JSON.stringify(response, undefined, 2),
        );
    });
  });
}
interface GH_PR {
  [key: string]: any;
  number: number;
  html_url?: string;
  body?: string;
}
function pullRequestEventMoveCard() {
  const payLoad: WebhookPayload = github.context.payload;
  const eventName: string = github.context.eventName;
  const pullRequest = payLoad.pull_request;

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
  try {
    const sourceList: string = process.env.TRELLO_SOURCE_LIST_ID as string;
    const targetList: string = process.env.TRELLO_TARGET_LIST_ID as string;
    const syncMembers: string = process.env.TRELLO_SYNC_BOARD_MEMBERS as string;

    if (!sourceList || !targetList) {
      throw Error("Trello's source and target list IDs must be present when moving card around.");
    }

    validateListExistsOnBoard(sourceList);
    validateListExistsOnBoard(targetList);
  } catch (error) {
    core.setFailed(error as Error);
    return;
  }

  getMembersOfBoard()
    .then((response) => {
      if (syncMembers.length === 0) {
        const prReviewers: string[] = pullRequest?.requested_reviewers.map(
          (reviewer: any) => reviewer.login as string,
        );
        const members: [] = response;
        const additionalMemberIds: string[] = [];
        prReviewers.forEach(function (reviewer) {
          members.forEach((member) => {
            if (member.username == reviewer) {
              additionalMemberIds[member.username] = member.id;
            }
          });
        });
        console.log('Additional members: ' + JSON.stringify(additionalMemberIds, undefined, 2));
      }
    })
    .then(() => {
      getCardsOfList(sourceList).then((response) => {
        const cards = response;
        const prIssuesReferenced: string[] = pullRequest?.body?.match(/#[1-9][0-9]*/) || [];
        const prUrl: string = pullRequest?.html_url || '';

        let cardId;
        let existingMemberIds = [];
        cards.some(function (card) {
          const haystack = `${card.name} ${card.desc}`;
          const card_issue_numbers = haystack.match(/#[0-9][1-9]*/) || [];
          if (debug) {
            console.log('card_issue_numbers', JSON.stringify(card_issue_numbers, undefined, 2));
          }
          card_issue_numbers.forEach((card_issue_number) => {
            if ((card_issue_number && prIssuesReferenced.indexOf(card_issue_number)) !== -1) {
              cardId = card.id;
              existingMemberIds.push(card.idMembers);
              return false;
            }
          });
        });
        const cardParams = {
          destinationListId: targetList,
          memberIds: existingMemberIds.concat(additionalMemberIds).join(),
        };

        if (cardId) {
          updateCard(cardId, cardParams).then(function (response) {
            getCardAttachments(cardId).then((response) => {
              console.log('getCardAttachments response: ', JSON.stringify(response, undefined, 2));
            });
            addUrlSourceToCard(cardId, prUrl);
          });
        } else {
          core.setFailed('Card not found.');
        }
      });
    });
}
