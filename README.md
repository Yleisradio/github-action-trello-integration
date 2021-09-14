# Github Action to manage referring Trello cards

This Github Action is used to move Trello cards between columns when Issues or Pull requests are created or changed.

You need to create one Workflow file or task for each Issue or Pull requests event.

## API key and token

Actions authenticate using API key and token. Your repository must have secrets `TRELLO_API_KEY` and `TRELLO_API_TOKEN` set up.

You should create a separate user account for Trello API usage and generate API key and token for this account. Generate tokens in Trello [https://trello.com/app-key](https://trello.com/app-key) > Developer API Keys > Token, and follow instructions on page [https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/](https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/).

## Under the hood

This action looks for Issue or Pull request ID (for example `#123`) within the configured list (column) on the configured Trello board. (All) found cards are moved to the target list (column).

The action operates with ugly looking ID's, so you can rename your board or lists as you wish - it initial IDs wiill not change.

Github Issue or Pull request ID is searched within each Trello card's title and description fields.

In order this functionality to behave properly in a multi-repository board as well you can enforce strict mode with env variable `TRELLO_BOARD_REPOSITORY_STRICT_MODE` (set it to non-falsy value). When enforced the card to be moved must have link to the repository as well (which is created automatically when this action creates the Trello card).

To get those ugly id's add `.json` at the end of the Board URL and look through the data for your boards and/or lists. Some browsers (such as [Firefox Developer Edition](https://www.mozilla.org/en-US/firefox/developer/)) display the JSON data more nicely than others, some need additional plugins to do so.

@see [https://docs.github.com/en/actions/creating-actions/creating-a-javascript-action](https://docs.github.com/en/actions/creating-actions/creating-a-javascript-action)

## Updating this Action

Change and commit the source code. Compile with `vercel/ncc` as instructed in [Github Action guide](https://docs.github.com/en/actions/creating-actions/creating-a-javascript-action#commit-tag-and-push-your-action-to-github).

    ncc build index.js --license licenses.txt
    git add dist
    git commit -m'Compiled'
