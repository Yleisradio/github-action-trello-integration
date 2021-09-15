import { getInput } from '@actions/core';
import fetch from 'node-fetch';
import { validateIdPattern } from './utils';

const apiBaseUrl = 'https://api.trello.com/1';
const cache = {};
const debug = getInput('verbose');

const boardId = () => {
  if (!validateIdPattern(process.env['TRELLO_BOARD_ID'])) {
    throw Error('Board ID is not valid.');
  }
  return process.env['TRELLO_BOARD_ID'];
};

/**
 * Build API URI.
 *
 * @param {string} endpoint
 * @returns string
 */
const buildApiUri = (endpoint) => `${apiBaseUrl}/${endpoint}`;

/**
 * Base headers for REST API  authentication et al.
 *
 * API access ie. apiKey and apiToken should be created in Trello as instructed on page
 * https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/#authorizing-a-client
 *
 * @returns object
 */
const apiBaseHeaders = () => {
  const apiKey = process.env['TRELLO_API_KEY'];
  const apiToken = process.env['TRELLO_API_TOKEN'];
  if (!apiKey || !apiToken) {
    throw Error('Trello API key and/or token is missing.');
  }

  return {
    Authorization: `OAuth oauth_consumer_key="${apiKey}", oauth_token="${apiToken}"`,
    redirect: 'follow',
    follow: 5,
    Accept: 'application/json',
    Method: 'GET',
  };
};

/**
 * Get Labels on a Board
 *
 * https://developer.atlassian.com/cloud/trello/rest/api-group-boards/#api-boards-id-labels-get
 *
 * @param {string} boardId
 *
 * @returns Object[]
 */
function getLabelsOfBoard() {
  const endpoint = `boards/${boardId}/labels`;
  const options = { ...apiBaseHeaders };
  if (!cache.boardLabels[boardId]) {
    cache.boardLabels[boardId] = new Promise(function (resolve, reject) {
      if (debug) {
        console.log(`getLabelsOfBoard calling ${buildApiUri(endpoint)} with`, options);
      }
      fetch(buildApiUri(endpoint), options)
        .then((body) => {
          if (debug) {
            console.log(`getLabelsOfBoard got response:`, body.json());
          }
          cache.boardLabels[boardId] = resolve(body.json());
          return cache.boardLabels[boardId];
        })
        .catch((error) => reject(error));
    });
  }
  return cache.boardLabels[boardId];
}

/**
 * Get the Members of a Board.
 *
 * https://developer.atlassian.com/cloud/trello/rest/api-group-boards/#api-boards-id-members-get
 *
 * @param {string} boardId
 *
 * @returns Object[]
 */
function getMembersOfBoard() {
  const endpoint = `boards/${boardId}/members`;
  const options = { ...apiBaseHeaders };
  if (!cache.boardMembers[boardId]) {
    cache.boardMembers[boardId] = new Promise(function (resolve, reject) {
      if (debug) {
        console.log(`getMembersOfBoard calling ${buildApiUri(endpoint)} with`, options);
      }
      fetch(buildApiUri(endpoint), options)
        .then((body) => {
          if (debug) {
            console.log(`getMembersOfBoard got response:`, body.json());
          }
          cache.boardMembers[boardId] = resolve(body.json());
          return cache.boardMembers[boardId];
        })
        .catch((error) => reject(error));
    });
  }
  return cache.boardMembers[boardId];
}

/**
 * Gets all (open) lists on Board.
 *
 * https://developer.atlassian.com/cloud/trello/guides/rest-api/nested-resources/#lists-nested-resource
 *
 * @param {string} boardId
 *
 * @returns Object[]
 */
function getListsOnBoard() {
  // We are only interested in open lists.
  const endpoint = `/object/${boardId}/lists??fields=all&filter==open`;
  const options = { ...apiBaseHeaders };
  if (!cache.boardLists[boardId]) {
    cache.boardLists[boardId] = new Promise(function (resolve, reject) {
      if (debug) {
        console.log(`getListsOnBoard calling ${buildApiUri(endpoint)} with`, options);
      }
      fetch(buildApiUri(endpoint), options)
        .then((body) => {
          if (debug) {
            console.log(`getListsOnBoard got response:`, body.json());
          }
          cache.boardLists[boardId] = resolve(body.json());
          return cache.boardLists[boardId];
        })
        .catch((error) => reject(error));
    });
  }
  return cache.boardLists[boardId];
}

/**
 * Get Cards in a List.
 *
 * https://developer.atlassian.com/cloud/trello/rest/api-group-lists/#api-lists-id-board-get
 *
 * @param {*} listId
 * @returns
 */
function getCardsOfList(listId) {
  const endpoint = `lists/${listId}/cards`;
  const options = { ...apiBaseHeaders };
  if (!cache.listCards[listId]) {
    cache.listCards[listId] = new Promise(function (resolve, reject) {
      if (debug) {
        console.log(`getListsOnBoard calling ${buildApiUri(endpoint)} with`, options);
      }
      fetch(buildApiUri(endpoint), options)
        .then((body) => {
          if (debug) {
            console.log(`getListsOnBoard got response:`, body.json());
          }
          cache.listCards[listId] = resolve(body.json());
          return cache.listCards[listId];
        })
        .catch((error) => reject(error));
    });
  }
  return cache.listCards[listId];
}
/**
 * Create a new Card
 *
 * https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-post

 * @param {string} listId
 * @param {*} params
 * @returns Card
 */
function createCard(listId, params) {
  const endpoint = `cards`;
  const options = {
    ...apiBaseHeaders,
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
  return new Promise(function (resolve, reject) {
    if (debug) {
      console.log(`createCard calling: ${buildApiUri(endpoint)} with `, options);
    }

    fetch(buildApiUri(endpoint), options)
      .then((body) => {
        if (debug) {
          console.log(`getListsOnBoard got response:`, body.json());
        }
        return resolve(body.json());
      })
      .catch((error) => reject(error));
  });
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
function updateCard(cardId, params) {
  const endpoint = `cards/${cardId}`;
  const options = {
    ...apiBaseHeaders,
    method: 'PUT',
    form: {
      idList: params.destinationListId,
      idMembers: params.memberIds,
    },
  };
  return new Promise(function (resolve, reject) {
    if (debug) {
      console.log(`updateCard calling: ${buildApiUri(endpoint)} with `, options);
    }

    fetch(buildApiUri(endpoint), options)
      .then((body) => {
        if (debug) {
          console.log(`updateCard got response:`, body.json());
        }
        return resolve(body.json());
      })
      .catch((error) => reject(error));
  });
}

/**
 * Get Attachments on a Card
 *
 * https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-id-attachments-get
 *
 * @param {*} cardId
 * @returns Attachment[]
 */
function getCardAttachments(cardId) {
  const endpoint = `cards/${cardId}/attachments`;
  const options = { ...apiBaseHeaders };

  return new Promise(function (resolve, reject) {
    if (debug) {
      console.log(`getCardAttachments calling: ${buildApiUri(endpoint)} with `, options);
    }

    fetch(buildApiUri(endpoint), options)
      .then((body) => {
        if (debug) {
          console.log(`getCardAttachments got response:`, body.json());
        }
        return resolve(body.json());
      })
      .catch((error) => reject(error));
  });
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
function addUrlSourceToCard(cardId, url) {
  const endpoint = `cards/${cardId}/attachments`;
  const options = {
    ...apiBaseHeaders,
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
    form: {
      url: url,
    },
  };
  return new Promise(function (resolve, reject) {
    if (debug) {
      console.log(`addUrlSourceToCard calling: ${buildApiUri(endpoint)} with `, options);
    }

    fetch(buildApiUri(endpoint), options)
      .then((body) => {
        if (debug) {
          console.log(`addUrlSourceToCard got response:`, body.json());
        }
        return resolve(body.json());
      })
      .catch((error) => reject(error));
  });
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
