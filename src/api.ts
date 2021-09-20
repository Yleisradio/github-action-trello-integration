import * as core from '@actions/core';
import fetch, { Response } from 'node-fetch';
import { boardId } from './utils';
import { RequestInit } from 'node-fetch';
import {
  TrelloLabel,
  TrelloList,
  TrelloMember,
  TrelloCard,
  TrelloAttachment,
  TrelloCardRequestParams,
} from './types';

const apiBaseUrl = 'https://api.trello.com/1';
const debug = core.getInput('verbose');
const trelloBoard = boardId();

const apiKey: string = process.env.TRELLO_API_KEY || '';
const apiToken: string = process.env.TRELLO_API_TOKEN || '';
if (!apiKey || !apiToken) {
  throw Error('Trello API key and/or token is missing.');
}

/**
 * Build API URI.
 *
 * @param {string} endpoint
 * @returns string
 */
const buildApiUri = (endpoint: string, additionalReqeustParameters?: string): string =>
  `${apiBaseUrl}${endpoint}?${
    additionalReqeustParameters ? additionalReqeustParameters + '&' : ''
  }key=${apiKey}&token=${apiToken}`;

/**
 * Base headers for REST API  authentication et al.
 *
 * API access ie. apiKey and apiToken should be created in Trello as instructed on page
 * https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/#authorizing-a-client
 *
 * @returns object
 */
const apiBaseHeaders = (): object => {
  return {
    Accept: 'application/json',
    Method: 'GET',
  };
};

/**
 * Get Labels on a Board
 *
 * https://developer.atlassian.com/cloud/trello/rest/api-group-boards/#api-boards-id-labels-get
 *
 * @returns Object[]
 */
function getLabelsOfBoard(): Promise<TrelloLabel[]> {
  const endpoint = `/boards/${trelloBoard}/labels`;
  const options: RequestInit = { ...(apiBaseHeaders() as RequestInit) };
  const functionName = 'getLabelsOfBoard()';

  if (debug) {
    console.log(
      ` ${functionName} calling ${buildApiUri(endpoint)} with options: ${JSON.stringify(
        options,
        undefined,
        2,
      )}`,
    );
  }
  return fetch(buildApiUri(endpoint), options)
    .then((response) => {
      if (!response.ok) {
        console.trace(JSON.stringify(response, undefined, 2));
        return [];
      } else {
        return response.json() as unknown as TrelloLabel[];
      }
    })
    .catch((error) => error);
}

/**
 * Get the Members of a Board.
 *
 * https://developer.atlassian.com/cloud/trello/rest/api-group-boards/#api-boards-id-members-get
 *
 * @returns Object[]
 */
function getMembersOfBoard(): Promise<TrelloMember[]> {
  const endpoint = `/boards/${trelloBoard}/members`;
  const options: RequestInit = { ...(apiBaseHeaders() as RequestInit) };
  const functionName = 'getMembersOfBoard()';

  if (debug) {
    console.log(
      ` ${functionName} calling ${buildApiUri(endpoint)} with options: ${JSON.stringify(
        options,
        undefined,
        2,
      )}`,
    );
  }
  return fetch(buildApiUri(endpoint), options)
    .then((response) => {
      if (!response.ok) {
        console.trace(JSON.stringify(response, undefined, 2));
        return [];
      } else {
        return response.json() as unknown as TrelloLabel[];
      }
    })
    .catch((error) => error);
}

/**
 * Get Lists on a Board (filter to open lists)
 *
 * https://developer.atlassian.com/cloud/trello/rest/api-group-boards/#api-boards-id-lists-get
 *
 * @returns Object[]
 */
function getListsOnBoard(): Promise<TrelloList[]> {
  // We are only interested in open lists.
  const endpoint = `/boards/${trelloBoard}/lists`;
  const endpointArgs = 'filter=open';
  const options: RequestInit = { ...(apiBaseHeaders() as RequestInit) };
  const functionName = 'getListsOnBoard()';
  if (debug) {
    console.log(`${functionName} kicked off`);
  }

  if (debug) {
    console.log(
      ` ${functionName} calling ${buildApiUri(
        endpoint,
        endpointArgs,
      )} with options: ${JSON.stringify(options, undefined, 2)}`,
    );
  }
  return fetch(buildApiUri(endpoint, endpointArgs), options)
    .then((response: Response) => {
      if (!response.ok) {
        console.trace(JSON.stringify(response, undefined, 2));
        return [];
      }
      return response.json() as unknown as TrelloList[];
    })
    .catch((error) => error);
}

/**
 * Get Cards in a List.
 *
 * https://developer.atlassian.com/cloud/trello/rest/api-group-lists/#api-lists-id-board-get
 *
 * @param {*} listId
 * @returns
 */
function getCardsOfList(listId: string): Promise<TrelloCard[]> {
  const endpoint = `/lists/${listId}/cards`;
  const options: RequestInit = { ...(apiBaseHeaders() as RequestInit) };
  const functionName = 'getCardsOfList()';

  if (debug) {
    console.log(
      ` ${functionName} calling ${buildApiUri(endpoint)} with options: ${JSON.stringify(
        options,
        undefined,
        2,
      )}`,
    );
  }
  return fetch(buildApiUri(endpoint), options)
    .then((response) => {
      if (!response.ok) {
        console.trace(JSON.stringify(response, undefined, 2));
        return [];
      } else {
        return response.json() as unknown as TrelloLabel[];
      }
    })
    .catch((error) => error);
}

/**
 * Create a new Card
 *
 * https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-post

 * @param {string} listId
 * @param {cardParams} params
 * @returns Card
 */
function createCard(listId: string, params: TrelloCardRequestParams): Promise<TrelloCard | null> {
  const endpoint = `/cards`;
  const options = {
    ...(apiBaseHeaders() as RequestInit),
    method: 'POST',
    url: buildApiUri(endpoint),
    form: {
      name: `[#${params.number}] ${params.title}`,
      desc: params.description,
      pos: 'bottom',
      idList: listId,
      urlSource: params.sourceUrl,
      idMembers: params.memberIds,
      idLabels: params.labelIds,
    },
    json: true,
  };
  const functionName = 'createCard()';

  if (debug) {
    console.log(
      ` ${functionName} calling ${buildApiUri(endpoint)} with options: ${JSON.stringify(
        options,
        undefined,
        2,
      )}`,
    );
  }
  return fetch(buildApiUri(endpoint), options as RequestInit)
    .then((response) => {
      if (!response.ok) {
        console.trace(JSON.stringify(response, undefined, 2));
        return null;
      } else {
        return response.json() as unknown as TrelloLabel[];
      }
    })
    .catch((error) => error);
}
/**
 * Update the contents of a Card.
 *
 * https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-id-put
 *
 * @param {*} cardId
 * @param {*} params
 * @returns
 */
function updateCard(cardId: string, params: TrelloCardRequestParams): Promise<TrelloCard> {
  const endpoint = `/cards/${cardId}`;
  const options = {
    ...apiBaseHeaders(),
    method: 'PUT',
    form: {
      idList: params.destinationListId,
      idMembers: params.memberIds,
    },
  };
  const functionName = 'updateCard()';

  if (debug) {
    console.log(
      ` ${functionName} calling ${buildApiUri(endpoint)} with options: ${JSON.stringify(
        options,
        undefined,
        2,
      )}`,
    );
  }
  return fetch(buildApiUri(endpoint), options as RequestInit)
    .then((response) => {
      if (!response.ok) {
        console.trace(JSON.stringify(response, undefined, 2));
        return [];
      } else {
        return response.json() as unknown as TrelloLabel[];
      }
    })
    .catch((error) => error);
}

/**
 * Get Attachments on a Card
 *
 * https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-id-attachments-get
 *
 * @param {*} cardId
 * @returns Attachment[]
 */
function getCardAttachments(cardId: string): Promise<TrelloAttachment[]> {
  const endpoint = `/cards/${cardId}/attachments`;
  const options = { ...apiBaseHeaders() };

  const functionName = 'getCardAttachments()';

  if (debug) {
    console.log(
      ` ${functionName} calling ${buildApiUri(endpoint)} with options: ${JSON.stringify(
        options,
        undefined,
        2,
      )}`,
    );
  }
  return fetch(buildApiUri(endpoint), options as RequestInit)
    .then((response) => {
      if (!response.ok) {
        console.trace(JSON.stringify(response, undefined, 2));
        return [];
      } else {
        return response.json() as unknown as TrelloLabel[];
      }
    })
    .catch((error) => error);
}

/**
 * Create Attachment On Card.
 *
 * https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-id-attachments-post
 *
 * @param {*} cardId
 * @param {*} url
 * @returns
 */
function addUrlSourceToCard(cardId: string, url: string): Promise<TrelloAttachment | null> {
  const endpoint = `/cards/${cardId}/attachments`;
  const options = {
    ...apiBaseHeaders(),
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
    form: {
      url: url,
    },
  };
  const functionName = 'addUrlSourceToCard()';

  if (debug) {
    console.log(
      ` ${functionName} calling ${buildApiUri(endpoint)} with options: ${JSON.stringify(
        options,
        undefined,
        2,
      )}`,
    );
  }
  return fetch(buildApiUri(endpoint), options as RequestInit)
    .then((response) => {
      if (!response.ok) {
        console.trace(JSON.stringify(response, undefined, 2));
        return null;
      } else {
        return response.json() as unknown as TrelloAttachment[];
      }
    })
    .catch((error) => error);
}

export {
  getLabelsOfBoard,
  getMembersOfBoard,
  getListsOnBoard,
  getCardsOfList,
  createCard,
  updateCard,
  getCardAttachments,
  addUrlSourceToCard,
};
