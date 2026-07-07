import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import OverviewPage from "../src/pages/OverviewPage";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe("OverviewPage", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("shows loading state initially", () => {
    // Never resolve — stays loading
    mockFetch.mockImplementationOnce(() => new Promise(() => {}));

    const { container } = render(
      <BrowserRouter>
        <OverviewPage />
      </BrowserRouter>
    );

    // Uses CSS skeleton placeholders, not text
    const skeletons = container.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders overview data when API succeeds", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          counts: {
            agents: 5,
            skills: 10,
            mcpServers: 3,
            experts: 2,
            projects: 1,
            contextItems: 0,
            artifacts: 0,
            events: 0,
          },
          agentMatrix: [{ agentId: "a1", agentName: "Test", skills: 2, mcpServers: 1, experts: 1 }],
          skillDistribution: { Test: 10 },
          attentionList: [],
        }),
    });

    render(
      <BrowserRouter>
        <OverviewPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Stat card labels should render
      expect(screen.getByText("Agents")).toBeInTheDocument();
    });

    // Hero title should be visible
    expect(screen.getByText("Agent Context Hub")).toBeInTheDocument();
    // "Agents" stat card shows count "5" (may appear multiple times in DOM)
    const fives = screen.getAllByText("5");
    expect(fives.length).toBeGreaterThan(0);
  });

  it("shows error state when API fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("API Error"));

    render(
      <BrowserRouter>
        <OverviewPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
    });
  });
});
