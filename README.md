# Github Action to manage referring Trello cards

This Github Action is used to move Trello cards between columns when Issues or Pull requests are created or changed.

You need to create one Workflow file or task for each Issue or Pull requests event.

## Available actions

The action uses Trello list IDs, not List names. Using ID allows you to rename the boards lists without breaking Github Actions. The list must not be archived.

Labels are created with the name you can see in the UI since we match them with the names used in Github. Example: you add labels `Urgent`, `Bug` and `Backend` in Github issue, and if your Trello board has a label called `Bug` (but not the others) that label will be the only label in the Trello card.

Members (or assignees in Github) are not be synced because the login names rarely match between Trello and Github. Syncing them might produce unexpected results.

### Open Cards on issues created in Github

New issue in Github can be reflected in Trello with action `issue_opened_create_card`. Example:

```yaml
name: Create Trello card on opened issues

on:
  issues:
    types: [opened]

jobs:
  create_trello_card_job:
    runs-on: ubuntu-latest
    name: Create Trello Card
    steps:
      - name: Call trello-github-actions
        uses: Yleisradio/github-action-trello-integration@v1.1.0
        with:
          action: issue_opened_create_card
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TRELLO_API_KEY: ${{ secrets.TRELLO_API_KEY }}
          TRELLO_API_TOKEN: ${{ secrets.TRELLO_API_TOKEN }}
          # TRELLO_BOARD_ID must match a board. GH repo should connect
          # to exactly one board, but Trello board may connect to multiple
          # GH repositories.
          TRELLO_BOARD_ID: BOARD-24-CHAR-LONG-ID
          # Backlog list ID
          TRELLO_LIST_ID: LIST-24-CHAR-LONG-ID
```

Required env variables include:

- `GITHUB_TOKEN` Github secret. This is necessary so the action can put a link to Trello Card to the issue (as a comment).
- `TRELLO_API_KEY` Trello API key. Use it via Github repository or organisation secrets. Do not store in your repository code.
- `TRELLO_API_TOKEN` Trello API token. Use it via Github repository or organisation secrets. Do not store in your repository code.
- `TRELLO_BOARD_ID` The id of your Trello board.
- `TRELLO_LIST_ID` The id of your Trello list (column) where you wish to place the new card. Using ID allows you to rename the boards lists without breaking Github Actions. The list must not be archived.

Optional env variables include:

- `TRELLO_ACTION_VERBOSE` to make action logs slightly more verbose.
- `TRELLO_API_DEBUG` expose all API call resposes in action log.
- `GITHUB_API_DEBUG` expose API call data in action log.

### Pull requests and Cards referring to PR or issue

When you open, update or close pull requests action `pull_request_event_move_card` can move cards referring to any issue mentioned in the pull request description (and only there). Example:

```yaml
name: Move Trello Card to Needs review list

on:
  pull_request:
    types: [opened, synchronize, reopened]
    #types: closed #for merged or just closed PRs
    branches:
      - main

jobs:
  move_card_when_pull_request_merged_job:
    runs-on: ubuntu-latest
    name: Move Trello Card to Needs review when Card refers to the issue referred by PR
    steps:
      - name: Call trello-github-actions
        id: call-trello-github-actions
        uses: Yleisradio/github-action-trello-integration@v1.1.0
        with:
          action: pull_request_event_move_card
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TRELLO_API_KEY: ${{ secrets.TRELLO_API_KEY }}
          TRELLO_API_TOKEN: ${{ secrets.TRELLO_API_TOKEN }}
          TRELLO_BOARD_ID: BOARD-24-CHAR-LONG-ID
          # List "In progress"
          TRELLO_SOURCE_LIST_ID: LIST-24-CHAR-LONG-ID-1
          # List "Needs review"
          TRELLO_TARGET_LIST_ID: LIST-24-CHAR-LONG-ID-2
```

Required env variables include:

- `GITHUB_TOKEN` Github secret. This is necessary so the action can put a link to Trello Card to the pull request (as a comment).
- `TRELLO_API_KEY` Trello API key. Use it via Github repository or organisation secrets. Do not store in your repository code.
- `TRELLO_API_TOKEN` Trello API token. Use it via Github repository or organisation secrets. Do not store in your repository code.
- `TRELLO_BOARD_ID` The id of your Trello board.
- `TRELLO_TARGET_LIST_ID` The id of your Trello list (column) where you wish to move the card.

Optional env variables include:

- `TRELLO_SOURCE_LIST_ID` The id of your Trello list (column) where you wish to limit searching the Card.
- `TRELLO_ACTION_VERBOSE` to make action logs slightly more verbose.
- `TRELLO_API_DEBUG` expose all API call resposes in action log.
- `GITHUB_API_DEBUG` expose API call data in action log.

## API key and token

Actions authenticate using API key and token. Your repository must have secrets `TRELLO_API_KEY` and `TRELLO_API_TOKEN` set up.

You should create a separate user account for Trello API usage and generate API key and token for this account. Generate tokens in Trello [https://trello.com/app-key](https://trello.com/app-key) > Developer API Keys > Token, and follow instructions on page [https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/](https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/).

## How do I find the necessary Trello board and list IDs?

To get those ID's add `.json` at the end of the Board URL and look through the data for your boards and/or lists. Some browsers (such as [Firefox Developer Edition](https://www.mozilla.org/en-US/firefox/developer/)) display the JSON data more nicely than others, some need additional plugins to do so.

@see [https://docs.github.com/en/actions/creating-actions/creating-a-javascript-action](https://docs.github.com/en/actions/creating-actions/creating-a-javascript-action)

---

## Updating this Action

Change and commit the source code. Compile with `@vercel/ncc` as instructed in [Github Action guide](https://docs.github.com/en/actions/creating-actions/creating-a-javascript-action#commit-tag-and-push-your-action-to-github).

```bash
#`pre-release` script runs linter and formatter and compiles the code.
yarn install
yarn pre-release
git add .
git commit -m'Compiled new code'
git tag -a 'Tagging new release v1.0.2' v1.0.2
```
