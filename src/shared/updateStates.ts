export type UpdateUrgency = "optional" | "recommended" | "required";

export interface UpdateStateContent {
  title: string;
  message: string;
  primaryActionLabel: string;
  secondaryActionLabel?: string;
}
