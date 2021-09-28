import { Url } from 'url';

interface TrelloList {
  id: string; // ^[0-9a-fA-F]{24}$;
  name: string;
  closed: boolean;
  pos: number;
  softLimit: string | null;
  idBoard: string;
  subscribed: boolean;
  limits?: {
    attachments: {
      perBoard: {
        status: string;
        disableAt: number;
        warnAt: number;
      };
    };
  };
}

interface TrelloLabel {
  id: string;
  idBoard: string;
  name: string;
  color: string;
}

interface TrelloCard {
  id: string;
  checkItemStates: string | null;
  closed: boolean;
  dateLastActivity: string;
  desc: string;
  descData: {
    emoji: object;
  };
  dueReminder: string | null;
  idBoard: string;
  idList: string;
  idMembersVoted: [];
  idShort: number;
  idAttachmentCover: string | null;
  idLabels: string[];
  manualCoverAttachment: boolean;
  name: string | null;
  pos: number;
  shortLink: string;
  isTemplate: boolean;
  cardRole: null;
  badges: {
    attachmentsByType: {
      trello: {
        board: number;
        card: number;
      };
    };
    location: boolean;
    votes: number;
    viewingMemberVoted: boolean;
    subscribed: boolean;
    fogbugz: string;
    checkItems: number;
    checkItemsChecked: number;
    checkItemsEarliestDue: string | null;
    comments: number;
    attachments: number;
    description: boolean;
    due: string | null;
    dueComplete: boolean;
    start: string | null;
  };
  dueComplete: boolean;
  due: string | null;
  idChecklists: string[];
  idMembers: string[];
  labels: TrelloLabel[];
  shortUrl: string;
  start: string | null;
  subscribed: boolean;
  url: string;
  cover: {
    idAttachment: string | null;
    color: string | null;
    idUploadedBackground: string | null;
    size: string;
    brightness: string;
    idPlugin: string | null;
  };
}

interface TrelloMember {
  id: string;
  fullName: string;
  username: string;
}

interface TrelloAttachment {
  id: string;
  bytes: string;
  date: string;
  edgeColor: string;
  idMember: string;
  isUpload: boolean;
  mimeType: string;
  name: string;
  previews: [];
  url: string;
  pos: number;
}

interface TrelloCardRequestParams {
  number?: string;
  title?: string;
  description?: string;
  sourceUrl?: string;
  memberIds?: string;
  labelIds?: string;
  destinationListId?: string;
}

interface ghBaseData {
  repoOwner: string;
  repoName: string;
}
interface ghCommentData extends ghBaseData {
  comment: string;
}
interface ghIssueData extends ghBaseData {
  issueNumber: number;
}
interface ghIssueCommentData extends ghCommentData {
  issueNumber: number;
}

interface ghResponseIssueComment {
  id: number;
  node_id: string;
  url: string;
  html_url: string;
  body: string;
  user: {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    site_admin: boolean;
  };
  created_at: string;
  updated_at: string;
  issue_url: string;
  author_association: string;
}

export {
  TrelloList,
  TrelloLabel,
  TrelloCard,
  TrelloMember,
  TrelloAttachment,
  TrelloCardRequestParams,
  ghIssueCommentData,
  ghIssueData,
  ghResponseIssueComment,
};
