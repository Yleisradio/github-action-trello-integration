import * as core from '@actions/core';
import * as github from '@actions/github';

import {
  getLabelsOfBoard,
  getMembersOfBoard,
  getCardsOfListOrBoard,
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
  const issueNumber = issue?.number;
  const issueTitle = issue?.title;
  const issueBody = issue?.body;
  const issueUrl = issue?.html_url;
  const issueAssigneeNicks = issue?.assignees.map((assignee: any) => assignee.login);
  const issueLabelNames = issue?.labels.map((label: any) => label.name);
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

    // No need to create the attachment for this repository separately since the createCard()
    // adds the backlink to the created issue, see
    // params.sourceUrl property.
    createCard(listId, params).then((createdCard) => {
      if (typeof createdCard === 'string') {
        core.setFailed(createdCard);
        return;
      }
      console.log(`Card created: "[#${issueNumber}] ${issueTitle}"`);

      if (debug)
        console.log(
          `Card created: "${createdCard.name}"`,
          JSON.stringify(createdCard, undefined, 2),
        );
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
    (sourceList && !validateListExistsOnBoard(sourceList)) ||
    !targetList ||
    !validateListExistsOnBoard(targetList)
  ) {
    core.setFailed('TRELLO_SOURCE_LIST_ID or TRELLO_TARGET_LIST_ID is invalid.');
    return;
  }

  // TODO: Allow unspecified target as well so that - say - PR moves card to "Ready for review"
  // list regardless of where it is currently.
  const cardsToBeMoved = getCardsOfListOrBoard(sourceList)
    .then((cardsOnList) => {
      if (typeof cardsOnList === 'string') {
        core.setFailed(cardsOnList);
        return [];
      }
      const referencedIssuesInGh: string[] = pullRequest?.body?.match(/#[1-9][0-9]*/) || [];

      return cardsOnList
        .filter((card) => {
          const haystack = `${card.name} ${card.desc}`;
          const issueRefsOnCurrentCard = haystack.match(/#[1-9][0-9]*/) || [];
          if (debug) {
            console.log(
              'issueRefsOnCurrentCard',
              JSON.stringify(issueRefsOnCurrentCard, undefined, 2),
            );
          }
          const crossMatchIssues = issueRefsOnCurrentCard.filter((issueRef) =>
            referencedIssuesInGh.includes(issueRef),
          );
          return crossMatchIssues.length !== 0;
        })
        .filter((card) => {
          console.log(`filtering card ${card.name} attachments.`);
          return getCardAttachments(card.id).then((attachments) => {
            if (typeof attachments === 'string') {
              return false;
            }
            attachments.find((attachment) => {
              console.log(
                `attachments url ${attachment.url}: ${
                  attachment.url.startsWith(repoHtmlUrl) ? 'matches' : 'miss'
                }`,
              );
              return attachment.url.startsWith(repoHtmlUrl);
            });
            return attachments.length !== 0;
          });
        });
    })
    .catch((error) => {
      console.error(error);
      core.setFailed('Something went wrong when querying Cards to be moved.');
      return [];
    });

  Promise.all([cardsToBeMoved]).then((promiseValues) => {
    const params = {
      destinationListId: targetList,
      memberIds: additionalMemberIds.join(),
    };

    promiseValues[0].forEach((card) => {
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
