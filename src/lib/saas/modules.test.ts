import { describe, expect, it } from "vitest";
import { canUseModule, moduleForPath } from "./modules";

describe("canUseModule", () => {
  it("fail-opens when the module list is empty or missing", () => {
    expect(canUseModule(null, "whatsapp.inbox")).toBe(true);
    expect(canUseModule([], "whatsapp.inbox")).toBe(true);
  });

  it("allows an exact module key", () => {
    expect(canUseModule(["whatsapp.inbox"], "whatsapp.inbox")).toBe(true);
    expect(canUseModule(["whatsapp.inbox"], "whatsapp.flows")).toBe(false);
  });

  it("lets the parent whatsapp key unlock every whatsapp.* child", () => {
    expect(canUseModule(["whatsapp"], "whatsapp.agents")).toBe(true);
    expect(canUseModule(["whatsapp"], "campaign.supporters")).toBe(false);
  });
});

describe("moduleForPath", () => {
  it("maps known routes", () => {
    expect(moduleForPath("/inbox")).toBe("whatsapp.inbox");
    expect(moduleForPath("/flows/abc")).toBe("whatsapp.flows");
  });

  it("returns null for unknown paths", () => {
    expect(moduleForPath("/settings")).toBeNull();
  });
});
