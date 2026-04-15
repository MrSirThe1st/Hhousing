export type OperatorExperience = "self_managed_owner" | "manager_for_others" | "mixed_operator";

export interface OperatorContext {
  experience: OperatorExperience;
}