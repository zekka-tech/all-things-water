import { afterEach, describe, expect, it, vi } from "vitest";
import {
  captureSensitiveParams,
  getSensitiveParam,
  resetSensitiveParams,
} from "./sensitiveParams";

function fakeHistory() {
  return { state: null, replaceState: vi.fn() };
}

describe("captureSensitiveParams", () => {
  afterEach(() => resetSensitiveParams());

  it("removes the token from the URL and keeps it in memory", () => {
    const history = fakeHistory();
    captureSensitiveParams(
      { pathname: "/checkout/cancel", search: "?orderId=o1&token=secret&orderRef=ATW-1", hash: "" },
      history,
    );
    expect(getSensitiveParam("token")).toBe("secret");
    expect(history.replaceState).toHaveBeenCalledWith(
      null,
      "",
      "/checkout/cancel?orderId=o1&orderRef=ATW-1",
    );
  });

  it("drops the query string entirely when only the token was present", () => {
    const history = fakeHistory();
    captureSensitiveParams({ pathname: "/x", search: "?token=t", hash: "#top" }, history);
    expect(history.replaceState).toHaveBeenCalledWith(null, "", "/x#top");
  });

  it("leaves URLs without sensitive params untouched", () => {
    const history = fakeHistory();
    captureSensitiveParams({ pathname: "/shop", search: "?ref=ABC", hash: "" }, history);
    expect(history.replaceState).not.toHaveBeenCalled();
    expect(getSensitiveParam("token")).toBeNull();
  });
});
