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
const trelloBoard = boardId();

const apiKey: string = process.env.TRELLO_API_KEY || '';
const apiToken: string = process.env.TRELLO_API_TOKEN || '';
const debug: string | boolean = process.env.TRELLO_API_DEBUG || false;

if (!apiKey || !apiToken || !trelloBoard) {
  throw Error('Trello API key and/or token or Board ID is missing.');
}

/**
 * Build API URI.
 *
 * @param {string} endpoint
 * @returns string
 */
const buildApiUri = (endpoint: string, query?: URLSearchParams): string => {
  const params = query ? query : new URLSearchParams();

  params.append('key', apiKey);
  params.append('token', apiToken);

  return `${apiBaseUrl}${endpoint}?${params.toString()}`;
};

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
    method: 'GET',
  };
};

/**
 * Get Labels on a Board
 *
 * https://developer.atlassian.com/cloud/trello/rest/api-group-boards/#api-boards-id-labels-get
 *
 * @returns Object[]
 */
function getLabelsOfBoard(): Promise<TrelloLabel[] | string> {
  const endpoint = `/boards/${trelloBoard}/labels`;
  const options: RequestInit = { ...(apiBaseHeaders() as RequestInit) };

  return fetch(buildApiUri(endpoint), options)
    .then(async (response) => {
      if (!response.ok) {
        console.error(`API endpoint ${endpoint} error: ${response.status} ${response.text}`);
        return `${response.status} ${response.text}`;
      }

      const data = (await response.json()) as unknown as TrelloLabel[];
      if (debug) {
        console.log(`${endpoint} response is`, JSON.stringify(data, undefined, 2));
      }
      return data;
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
function getMembersOfBoard(): Promise<TrelloMember[] | string> {
  const endpoint = `/boards/${trelloBoard}/members`;
  const options: RequestInit = { ...(apiBaseHeaders() as RequestInit) };

  return fetch(buildApiUri(endpoint), options)
    .then(async (response) => {
      if (!response.ok) {
        console.error(`API endpoint ${endpoint} error: ${response.status} ${response.text}`);
        return `${response.status} ${response.text}`;
      }

      const data = (await response.json()) as unknown as TrelloLabel[];
      if (debug) {
        console.log(`${endpoint} response is`, JSON.stringify(data, undefined, 2));
      }
      return data;
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
function getListsOnBoard(): Promise<TrelloList[] | string> {
  // We are only interested in open lists.
  const endpoint = `/boards/${trelloBoard}/lists`;
  const endpointArgs = new URLSearchParams();
  endpointArgs.append('filter', 'open');
  const options: RequestInit = { ...(apiBaseHeaders() as RequestInit) };

  return fetch(buildApiUri(endpoint, endpointArgs), options)
    .then(async (response: Response) => {
      if (!response.ok) {
        console.error(`API endpoint ${endpoint} error: ${response.status} ${response.text}`);
        return `${response.status} ${response.text}`;
      }

      const data = (await response.json()) as unknown as TrelloLabel[];
      if (debug) {
        console.log(`${endpoint} response is`, JSON.stringify(data, undefined, 2));
      }
      return data;
    })
    .catch((error) => error);
}

/**
 * Get Cards in a List / Board.
 *
 * https://developer.atlassian.com/cloud/trello/rest/api-group-lists/#api-lists-id-board-get
 * https://developer.atlassian.com/cloud/trello/rest/api-group-boards/#api-boards-id-cards-get
 *
 * @param {*} listId
 * @returns
 */
function getCardsOfListOrBoard(listId?: string): Promise<TrelloCard[] | string> {
  const endpoint = listId ? `/lists/${listId}/cards` : `/boards/${trelloBoard}/cards`;
  const options: RequestInit = { ...(apiBaseHeaders() as RequestInit) };

  return fetch(buildApiUri(endpoint), options)
    .then(async (response) => {
      if (!response.ok) {
        console.error(`API endpoint ${endpoint} error: ${response.status} ${response.text}`);
        return `${response.status} ${response.text}`;
      }

      const data = (await response.json()) as unknown as TrelloLabel[];
      if (debug) {
        console.log(`${endpoint} response is`, JSON.stringify(data, undefined, 2));
      }
      return data;
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
function createCard(listId: string, params: TrelloCardRequestParams): Promise<TrelloCard | string> {
  const endpoint = `/cards`;
  const options = {
    ...(apiBaseHeaders() as RequestInit),
    method: 'POST',
  };
  // Examples imply that one shoudl be able to pass an object to the constructor, yet
  // TS is not happy about it, so we convert the object to string first.
  const queryParams = new URLSearchParams();
  queryParams.append('name', `[#${params.number}] ${params.title}`);
  queryParams.append('desc', params.description || '');
  queryParams.append('pos', 'bottom');
  queryParams.append('idList', listId);
  queryParams.append('urlSource', params.sourceUrl || '');
  queryParams.append('idMembers', params.memberIds || '');
  queryParams.append('idLabels', params.labelIds || '');

  const functionName = 'createCard()';

  return fetch(buildApiUri(endpoint, queryParams), options as RequestInit)
    .then(async (response) => {
      if (!response.ok) {
        console.error(`API endpoint ${endpoint} error: ${response.status} ${response.text}`);
        return `${response.status} ${response.text}`;
      }

      const data = (await response.json()) as unknown as TrelloLabel[];
      if (debug) {
        console.log(`${endpoint} response is`, JSON.stringify(data, undefined, 2));
      }
      return data;
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
function updateCard(cardId: string, params: TrelloCardRequestParams): Promise<TrelloCard | string> {
  const endpoint = `/cards/${cardId}`;
  const options = {
    ...apiBaseHeaders(),
    method: 'PUT',
  };
  const queryParams = new URLSearchParams();
  queryParams.append('idList', params.destinationListId || '');
  queryParams.append('idMembers', params.memberIds || '');

  return fetch(buildApiUri(endpoint, queryParams), options as RequestInit)
    .then(async (response) => {
      if (!response.ok) {
        console.error(`API endpoint ${endpoint} error: ${response.status} ${response.text}`);
        return `${response.status} ${response.text}`;
      }

      const data = (await response.json()) as unknown as TrelloLabel[];
      if (debug) {
        console.log(`${endpoint} response is`, JSON.stringify(data, undefined, 2));
      }
      return data;
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
function getCardAttachments(cardId: string): Promise<TrelloAttachment[] | string> {
  const endpoint = `/cards/${cardId}/attachments`;
  const options = { ...apiBaseHeaders() };

  return fetch(buildApiUri(endpoint), options as RequestInit)
    .then(async (response) => {
      if (!response.ok) {
        console.error(`API endpoint ${endpoint} error: ${response.status} ${response.text}`);
        return `${response.status} ${response.text}`;
      }

      const data = (await response.json()) as unknown as TrelloLabel[];
      if (debug) {
        console.log(`${endpoint} response is`, JSON.stringify(data, undefined, 2));
      }
      return data;
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
function addAttachmentToCard(cardId: string, url: string): Promise<TrelloAttachment | string> {
  const endpoint = `/cards/${cardId}/attachments`;
  const options = {
    ...apiBaseHeaders(),
    method: 'POST',
  };
  const queryParams = new URLSearchParams();
  queryParams.append('url', url);

  return fetch(buildApiUri(endpoint, queryParams), options as RequestInit)
    .then(async (response) => {
      if (!response.ok) {
        console.error(`API endpoint ${endpoint} error: ${response.status} ${response.text}`);
        return `${response.status} ${response.text}`;
      }

      const data = (await response.json()) as unknown as TrelloLabel[];
      if (debug) {
        console.log(`${endpoint} response is`, JSON.stringify(data, undefined, 2));
      }
      return data;
    })
    .catch((error) => error);
}

export {
  getLabelsOfBoard,
  getMembersOfBoard,
  getListsOnBoard,
  getCardsOfListOrBoard,
  createCard,
  updateCard,
  getCardAttachments,
  addAttachmentToCard,
};
