import matter from 'gray-matter';

export const EDITORIAL_WORKFLOW_ERROR = 'EDITORIAL_WORKFLOW_ERROR';

export class EditorialWorkflowError extends Error {
  constructor(message, notUnderEditorialWorkflow) {
    super(message);
    this.message = message;
    this.notUnderEditorialWorkflow = notUnderEditorialWorkflow;
    this.name = EDITORIAL_WORKFLOW_ERROR;
  }
}

export const getMatter = (markdown) => {
  return matter(markdown);
};
