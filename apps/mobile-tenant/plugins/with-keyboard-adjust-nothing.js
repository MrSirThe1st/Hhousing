const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Keep the window from resizing/panning when the soft keyboard opens.
 * Keyboard overlays content instead of pushing the layout.
 */
function withKeyboardAdjustNothing(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    const activities = application?.activity;
    if (!Array.isArray(activities)) {
      return config;
    }

    for (const activity of activities) {
      const name = activity?.$?.["android:name"];
      if (name === ".MainActivity" || name?.endsWith(".MainActivity")) {
        activity.$["android:windowSoftInputMode"] = "adjustNothing";
      }
    }

    return config;
  });
}

module.exports = withKeyboardAdjustNothing;
