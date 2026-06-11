import { getJsonString, readJsonObject } from "@/lib/response-json";

export async function fetchDefaultPositionMatchCriteria(fetcher: typeof fetch = fetch) {
  const response = await fetcher("/api/settings/system-settings");
  if (!response.ok) {
    return "";
  }

  return getJsonString(await readJsonObject(response), "defaultMatchCriteria") ?? "";
}
