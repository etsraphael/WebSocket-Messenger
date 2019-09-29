export abstract class Message {
  _id: string;
  owner: string;
  createdAt: Date;

  constructor(public participants: string[], public type: string) {}
}

export class MessageText extends Message {
  constructor(participants: string[], type: string, public text: string) {
    super(participants, type);
  }
}
