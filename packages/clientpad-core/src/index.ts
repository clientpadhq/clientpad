export const CLIENTPAD_PACKAGE_NAME = "@abdulmuiz44/clientpad-core";

export const CLIENTPAD_APP_NAME = "ClientPad";

export type ClientPadPackageInfo = {
  name: string;
  appName: string;
};

export function getClientPadPackageInfo(): ClientPadPackageInfo {
  return {
    name: CLIENTPAD_PACKAGE_NAME,
    appName: CLIENTPAD_APP_NAME,
  };
}
