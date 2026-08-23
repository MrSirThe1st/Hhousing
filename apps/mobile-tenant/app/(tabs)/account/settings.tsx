import { Redirect } from "expo-router";

/** Settings content now lives on the account root tab. */
export default function SettingsRedirect(): React.ReactElement {
  return <Redirect href="/(tabs)/account" />;
}
