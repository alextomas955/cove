import { valuesEqual } from "./changedUpdateFields";

// An open editor keeps the user's input when the entity it edits refetches, but should not keep showing
// data the server has since replaced. Rebasing moves the form onto the refetched entity: fields the user
// has not touched (still equal to the baseline the form was filled from) take the new values, and touched
// fields keep the user's input. The caller then adopts the refetched entity as its new baseline.

/** The fields of `next` that should replace `current`: untouched since `baseline`, and changed on the server. */
export function untouchedFieldUpdates<T extends object>(current: T, baseline: T, next: T): Partial<T> {
  const updates: Partial<T> = {};
  for (const key of Object.keys(next) as (keyof T)[]) {
    if (valuesEqual(current[key], baseline[key]) && !valuesEqual(current[key], next[key])) {
      updates[key] = next[key];
    }
  }
  return updates;
}

export type FormFieldSetters<T> = { [K in keyof T]: (value: T[K]) => void };

/** Applies field values to an editor that keeps one piece of state per field. */
export function applyFormFields<T extends object>(values: Partial<T>, setters: FormFieldSetters<T>) {
  for (const key of Object.keys(values) as (keyof T)[]) {
    setters[key](values[key] as T[keyof T]);
  }
}
