import * as core from '@actions/core';
import { getListsOnBoard } from './api';

const debug = core.getInput('verbose');

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
const validateListExistsOnBoard = async (listId: string) => {
  if (!validateIdPattern(listId)) {
    return false;
  }
  const listsOnBoard = await getListsOnBoard();
  const matching = listsOnBoard.filter((list) => list.id === listId);
  if (matching.length === 0) {
    console.error('List id is not valid (pattern): ' + listId);
    return false;
  }
  return true;
};

const boardId = (): string => {
  if (
    process &&
    process.env &&
    process.env.TRELLO_BOARD_ID &&
    validateIdPattern(process.env.TRELLO_BOARD_ID)
  ) {
    if (debug) {
      console.log('TRELLO_BOARD_ID pattern is valid: ' + process.env.TRELLO_BOARD_ID);
    }
    return process.env.TRELLO_BOARD_ID;
  }
  console.log('TRELLO_BOARD_ID pattern does not match the pattern.');
  return '';
};

export { validateIdPattern, validateListExistsOnBoard, boardId };
