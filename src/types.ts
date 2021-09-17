interface TrelloList {
  id: string; // ^[0-9a-fA-F]{24}$;
  name: string;
  closed: boolean;
  pos: number;
  softLimit: string;
  idBoard: string;
  subscribed: boolean;
  limits: {
    attachments: {
      perBoard: {
        status: string;
        disableAt: number;
        warnAt: number;
      };
    };
  };
}

export { TrelloList };
