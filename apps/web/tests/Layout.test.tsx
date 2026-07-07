import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Layout from "../src/components/Layout";

// Mock fetch for health check
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe("Layout", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  it("renders the sidebar with navigation links", () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: "ok" }),
    });

    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );

    // Navigation links should be in the DOM
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Agents")).toBeInTheDocument();
    expect(screen.getByText("Skills")).toBeInTheDocument();
  });

  it("shows disconnected status when health check fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Disconnected")).toBeInTheDocument();
    });
  });

  it("shows connected status when health check succeeds", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: "ok" }),
    });

    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Connected")).toBeInTheDocument();
    });
  });

  it("renders the brand name", () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: "ok" }),
    });

    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );

    expect(screen.getByText("Agent Hub")).toBeInTheDocument();
  });
});
