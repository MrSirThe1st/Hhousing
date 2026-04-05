export type OperatorExperience = "self_managed_owner" | "manager_for_others" | "mixed_operator";

export type OperatorScope = "owned" | "managed";

export interface OperatorContext {
  experience: OperatorExperience;
  availableScopes: OperatorScope[];
  currentScope: OperatorScope;
  canSwitch: boolean;
}