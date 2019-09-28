interface IExecutor {
  execute: () => void;
}

export class Executor implements IExecutor {
  constructor(public execute: () => void) {}
}
