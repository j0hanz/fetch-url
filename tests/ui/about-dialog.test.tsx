// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AboutDialog from "@/components/about-dialog";

describe("AboutDialog", () => {
  it("exposes an accessible dialog name", async () => {
    render(
      <AboutDialog markdown="# Overview" howItWorksMarkdown="# How It Works" />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /about page converter/i }),
    );

    expect(
      await screen.findByRole("dialog", { name: /about/i }),
    ).toBeInTheDocument();
  });
});
