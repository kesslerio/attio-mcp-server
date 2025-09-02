export type SanitizedValue =
  | string
  | number
  | boolean
  | null
  | SanitizedObject
  | SanitizedValue[];

export interface SanitizedObject extends Record<string, SanitizedValue> {
  [key: string]: SanitizedValue;
}
