import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Avatar } from "./avatar";

describe("Avatar", () => {
  it("imageUrl 있으면 이미지, 없으면 이니셜 폴백", () => {
    const { container, rerender } = render(<Avatar initial="지" color="#3B7DF0" />);
    expect(screen.getByText("지")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();

    rerender(<Avatar initial="지" color="#3B7DF0" imageUrl="https://cdn/a.png" />);
    // 장식용 아바타라 alt="" (role=img 아님) → DOM 으로 조회.
    expect(container.querySelector("img")).toHaveAttribute("src", "https://cdn/a.png");
    expect(screen.queryByText("지")).toBeNull();
  });
});
