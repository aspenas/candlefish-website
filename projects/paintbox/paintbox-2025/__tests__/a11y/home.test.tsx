import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import Home from "@/app/page";

expect.extend(toHaveNoViolations);

describe("Home accessibility", () => {
  it("has no a11y violations", async () => {
    const { container } = render(<Home />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
