export enum ChangeType {
  Delete = 'DELETE',
  Insert = 'Insert',
}

export interface StringDeletion {
  type: ChangeType.Delete;
  /**
   * Place in the original text to start deleting characters
   */
  start: number;
  /**
   * Number of characters to delete
   */
  length: number;
}

export interface StringInsertion {
  type: ChangeType.Insert;
  /**
   * Text to insert into the original text
   */
  text: string;
  /**
   * Place in the original text to insert new text
   */
  index: number;
}

/**
 * A change to be made to a string
 */
export type StringChange = StringInsertion | StringDeletion;

/**
 * Applies a list of changes to a string's original value.
 *
 * This is useful when working with ASTs.
 *
 * For Example, to rename a property in a method's options:
 *
 * ```
 * const code = `bootstrap({
 *   target: document.querySelector('#app')
 * })`;
 *
 * const indexOfPropertyName = 13; // Usually determined by analyzing an AST.
 * const updatedCode = applyChangesToString(code, [
 *   {
 *     type: ChangeType.Insert,
 *     index: indexOfPropertyName,
 *     text: 'element'
 *   },
 *   {
 *     type: ChangeType.Delete,
 *     start: indexOfPropertyName,
 *     length: 6
 *   },
 * ]);
 *
 * bootstrap({
 *   element: document.querySelector('#app')
 * });
 * ```
 */
export function applyChangesToString(
  text: string,
  changes: StringChange[]
): string {
  assertChangesValid(changes);
  const sortedChanges = changes.sort(
    (a, b) => getChangeIndex(a) - getChangeIndex(b)
  );
  let offset = 0;
  for (const change of sortedChanges) {
    switch (change.type) {
      case ChangeType.Insert: {
        const index = change.index + Math.max(offset, 0);
        text = text.substr(0, index) + change.text + text.substr(index);
        offset += change.text.length;
        break;
      }
      case ChangeType.Delete: {
        text =
          text.substr(0, change.start + offset) +
          text.substr(change.start + change.length + offset);
        offset -= change.length;
        break;
      }
    }
  }
  return text;
}

function assertChangesValid(changes: Array<StringInsertion | StringDeletion>) {
  for (const change of changes) {
    switch (change.type) {
      case ChangeType.Delete: {
        if (!Number.isInteger(change.start)) {
          throw new TypeError(`${change.start} must be an integer.`);
        }
        if (change.start < 0) {
          throw new Error(`${change.start} must be a positive integer.`);
        }
        if (!Number.isInteger(change.length)) {
          throw new TypeError(`${change.length} must be an integer.`);
        }
        if (change.length < 0) {
          throw new Error(`${change.length} must be a positive integer.`);
        }
        break;
      }
      case ChangeType.Insert:
        {
          if (!Number.isInteger(change.index)) {
            throw new TypeError(`${change.index} must be an integer.`);
          }
          if (change.index < 0) {
            throw new Error(`${change.index} must be a positive integer.`);
          }
          if (typeof change.text !== 'string') {
            throw new Error(`${change.text} must be a string.`);
          }
        }
        break;
    }
  }
}

function getChangeIndex(change: StringInsertion | StringDeletion) {
  switch (change.type) {
    case ChangeType.Insert: {
      return change.index;
    }
    case ChangeType.Delete: {
      return change.start;
    }
  }
}
