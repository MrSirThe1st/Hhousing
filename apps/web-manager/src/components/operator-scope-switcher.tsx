import type { OperatorContext } from "../lib/operator-context.types";

interface OperatorScopeSwitcherProps {
  context: OperatorContext;
}

export default function OperatorScopeSwitcher({ context }: OperatorScopeSwitcherProps): React.ReactElement {
  void context;

  return <></>;
}
