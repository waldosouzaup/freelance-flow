import { describe, it, expect } from "vitest";
import { formatCep, formatCpfCnpj, formatPhone } from "../pages/ClientForm";

describe("Client Formatters", () => {
  describe("formatCep", () => {
    it("formats 8-digit CEP correctly", () => {
      expect(formatCep("33202462")).toBe("33202-462");
    });

    it("handles partial input gracefully", () => {
      expect(formatCep("33202")).toBe("33202");
      expect(formatCep("3320")).toBe("3320");
    });

    it("strips non-digits and limits to 8 digits", () => {
      expect(formatCep("33.202-462999")).toBe("33202-462");
    });
  });

  describe("formatCpfCnpj", () => {
    it("formats 11-digit CPF correctly", () => {
      expect(formatCpfCnpj("04198842620")).toBe("041.988.426-20");
    });

    it("formats 14-digit CNPJ correctly", () => {
      expect(formatCpfCnpj("12345678000195")).toBe("12.345.678/0001-95");
    });

    it("strips non-digit characters", () => {
      expect(formatCpfCnpj("041.988.426-20")).toBe("041.988.426-20");
    });
  });

  describe("formatPhone", () => {
    it("formats 11-digit mobile phone correctly", () => {
      expect(formatPhone("31995607925")).toBe("(31) 99560-7925");
    });

    it("formats 10-digit landline phone correctly", () => {
      expect(formatPhone("3136210000")).toBe("(31) 3621-0000");
    });

    it("strips excess digits and non-digits", () => {
      expect(formatPhone("(31) 99560-792599")).toBe("(31) 99560-7925");
    });
  });
});
