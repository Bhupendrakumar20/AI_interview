/**
 * @enum {string}
 */
const MessageTypeEnum = {
  TRANSCRIPT: "transcript",
  FUNCTION_CALL: "function-call",
  FUNCTION_CALL_RESULT: "function-call-result",
  ADD_MESSAGE: "add-message",
};

/**
 * @enum {string}
 */
const MessageRoleEnum = {
  USER: "user",
  SYSTEM: "system",
  ASSISTANT: "assistant",
};

/**
 * @enum {string}
 */
const TranscriptMessageTypeEnum = {
  PARTIAL: "partial",
  FINAL: "final",
};

/**
 * @typedef {Object} BaseMessage
 * @property {string} type
 */

/**
 * @typedef {Object} TranscriptMessage
 * @property {string} type
 * @property {string} role
 * @property {string} transcriptType
 * @property {string} transcript
 */

/**
 * @typedef {Object} FunctionCallMessage
 * @property {string} type
 * @property {{name: string, parameters: unknown}} functionCall
 */

/**
 * @typedef {Object} FunctionCallResultMessage
 * @property {string} type
 * @property {{forwardToClientEnabled?: boolean, result: unknown, [key: string]: unknown}} functionCallResult
 */

/**
 * @typedef {TranscriptMessage | FunctionCallMessage | FunctionCallResultMessage} Message
 */

export {
  MessageTypeEnum,
  MessageRoleEnum,
  TranscriptMessageTypeEnum,
};
