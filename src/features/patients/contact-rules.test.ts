import { describe, expect, it } from "vitest";
import { canAddContact } from "./contact-rules";

const patient = { first_name: "Asha", sex_at_birth: "female", phone: "+919876543210" };
const fullContact = { name: "Ravi", relationship: "Brother", phone: "+919812345678" };

describe("canAddContact", () => {
  it("blocks until the patient's required details are filled", () => {
    expect(canAddContact({}, 5).allowed).toBe(false);
    expect(canAddContact({ ...patient, first_name: " " }, 5).allowed).toBe(false);
    expect(canAddContact({ ...patient, sex_at_birth: "" }, 5).allowed).toBe(false);
    expect(canAddContact({ ...patient, phone: "+91" }, 5).allowed).toBe(false);
  });
  it("allows the first contact once the patient is ready", () => {
    expect(canAddContact(patient, 5)).toEqual({ allowed: true, reason: null });
  });
  it("blocks while an existing contact is incomplete", () => {
    expect(canAddContact({ ...patient, contacts: [{ name: "Ravi", relationship: "", phone: "" }] }, 5).allowed).toBe(false);
    expect(canAddContact({ ...patient, contacts: [fullContact] }, 5).allowed).toBe(true);
  });
  it("blocks at the limit", () => {
    const five = Array.from({ length: 5 }, () => fullContact);
    expect(canAddContact({ ...patient, contacts: five }, 5).allowed).toBe(false);
  });
});