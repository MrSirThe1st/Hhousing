import { Redirect } from "expo-router";

/** Documents are hidden for now — keep route so old links don't break. */
export default function DocumentsRedirect(): React.ReactElement {
  return <Redirect href="/(tabs)/account" />;
}
