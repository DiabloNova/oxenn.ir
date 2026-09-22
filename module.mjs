// @ts-check
import { module } from "@prisma/composer";
import aiBrandingPlatformService from "./service.mjs";

export default module("oxenn-ir", ({ provision }) => {
  provision(aiBrandingPlatformService, { id: "aibrandingplatform" });
});
