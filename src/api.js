import { getInput } from '@actions/core';
import fetch from 'node-fetch-cache';
import { boardId } from './utils';

const apiBaseUrl = 'https://api.trello.com/1';
const cache = {
  boardLabels: [],
  boardMembers: [],
  boardLists: [],
  listCards: [],
};
const debug = getInput('verbose');
const trelloBoard = boardId();
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
  const apiKey = process.env.TRELLO_API_KEY;
  const apiToken = process.env.TRELLO_API_TOKEN;
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
 * @returns Object[]
 */
function getLabelsOfBoard() {
  const endpoint = `boards/${trelloBoard}/labels`;
  const options = { ...apiBaseHeaders };
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
  fetch(buildApiUri(endpoint), options).then(async (response) => {
    if (!response.ok) {
      await response.ejectFromCache();
      throw new Error(`Non-okay response with ${functionName}`);
    } else {
      const data = response.json();
      if (debug) {
        console.log(`${functionName} got response:`, JSON.stringify(data, undefined, 2));
      }
      return data;
    }
  });
}

/**
 * Get the Members of a Board.
 *
 * https://developer.atlassian.com/cloud/trello/rest/api-group-boards/#api-boards-id-members-get
 *
 * @returns Object[]
 */
function getMembersOfBoard() {
  const endpoint = `boards/${trelloBoard}/members`;
  const options = { ...apiBaseHeaders };
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
  fetch(buildApiUri(endpoint), options).then(async (response) => {
    if (!response.ok) {
      await response.ejectFromCache();
      throw new Error(`Non-okay response with ${functionName}`);
    } else {
      const data = response.json();
      if (debug) {
        console.log(`${functionName} got response:`, JSON.stringify(data, undefined, 2));
      }
      return data;
    }
  });
}

/**
 * Gets all (open) lists on Board.
 *
 * https://developer.atlassian.com/cloud/trello/guides/rest-api/nested-resources/#lists-nested-resource
 *
 * @returns Object[]
 */
function getListsOnBoard() {
  // We are only interested in open lists.
  const endpoint = `/object/${trelloBoard}/lists??fields=all&filter==open`;
  const options = { ...apiBaseHeaders };
  const functionName = 'getListsOnBoard()';

  if (debug) {
    console.log(
      ` ${functionName} calling ${buildApiUri(endpoint)} with options: ${JSON.stringify(
        options,
        undefined,
        2,
      )}`,
    );
  }
  fetch(buildApiUri(endpoint), options).then(async (response) => {
    if (!response.ok) {
      if (debug) {
        console.log(`${functionName} got response:`, JSON.stringify(response, undefined, 2));
      }
      await response.ejectFromCache();
      throw new Error(`Non-okay response with ${functionName}`);
    } else {
      const data = response.json();
      if (debug) {
        console.log(`${functionName} got response:`, JSON.stringify(data, undefined, 2));
      }
      return data;
    }
  });
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
  fetch(buildApiUri(endpoint), options).then(async (response) => {
    if (!response.ok) {
      await response.ejectFromCache();
      throw new Error(`Non-okay response with ${functionName}`);
    } else {
      const data = response.json();
      if (debug) {
        console.log(`${functionName} got response:`, JSON.stringify(data, undefined, 2));
      }
      return data;
    }
  });
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
  fetch(buildApiUri(endpoint), options).then(async (response) => {
    if (!response.ok) {
      await response.ejectFromCache();
      throw new Error(`Non-okay response with ${functionName}`);
    } else {
      const data = response.json();
      if (debug) {
        console.log(`${functionName} got response:`, JSON.stringify(data, undefined, 2));
      }
      return data;
    }
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
  fetch(buildApiUri(endpoint), options).then(async (response) => {
    if (!response.ok) {
      await response.ejectFromCache();
      throw new Error(`Non-okay response with ${functionName}`);
    } else {
      const data = response.json();
      if (debug) {
        console.log(`${functionName} got response:`, JSON.stringify(data, undefined, 2));
      }
      return data;
    }
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
  fetch(buildApiUri(endpoint), options).then(async (response) => {
    if (!response.ok) {
      await response.ejectFromCache();
      throw new Error(`Non-okay response with ${functionName}`);
    } else {
      const data = response.json();
      if (debug) {
        console.log(`${functionName} got response:`, JSON.stringify(data, undefined, 2));
      }
      return data;
    }
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
  fetch(buildApiUri(endpoint), options).then(async (response) => {
    if (!response.ok) {
      await response.ejectFromCache();
      throw new Error(`Non-okay response with ${functionName}`);
    } else {
      const data = response.json();
      if (debug) {
        console.log(`${functionName} got response:`, JSON.stringify(data, undefined, 2));
      }
      return data;
    }
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
