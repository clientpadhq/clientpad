export const CLIENTPAD_CORE_PACKAGE_NAME = "@abdulmuiz44/clientpad-core";

export const CLIENTPAD_APP_NAME = "ClientPad";

export type ClientPadCoreInfo = {
  packageName: string;
  appName: string;
};

export function getClientPadCoreInfo(): ClientPadCoreInfo {
  return {
    packageName: CLIENTPAD_CORE_PACKAGE_NAME,
    appName: CLIENTPAD_APP_NAME,
  };
}
