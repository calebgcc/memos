import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { MemoFilterProvider } from "@/contexts/MemoFilterContext";
import { useDateFilterNavigation } from "@/hooks/useDateFilterNavigation";
import { buildMemoFilter } from "@/hooks/useMemoFilters";
import { buildDaysFilter, getLocalDayTimestampRange, getMonthDay, getOnThisDayDates } from "@/lib/calendar-utils";

describe("getOnThisDayDates", () => {
  it("lists the same day in earlier years, newest first", () => {
    expect(getOnThisDayDates("11-17", new Date(2026, 10, 17), 3)).toEqual(["2025-11-17", "2024-11-17", "2023-11-17"]);
  });

  it("keeps Feb 29 to leap years", () => {
    expect(getOnThisDayDates("02-29", new Date(2026, 1, 28), 6)).toEqual(["2024-02-29", "2020-02-29"]);
  });

  it("rejects values that are not MM-DD", () => {
    expect(getOnThisDayDates("2026-11-17", new Date(2026, 10, 17))).toEqual([]);
    expect(getOnThisDayDates("13-01", new Date(2026, 10, 17))).toEqual([]);
  });

  it("formats today as MM-DD", () => {
    expect(getMonthDay(new Date(2026, 0, 5))).toBe("01-05");
  });
});

describe("onThisDay memo filter", () => {
  it("ORs one day range per earlier year", () => {
    const range = getLocalDayTimestampRange("2025-11-17");
    expect(buildDaysFilter("created_ts", ["2025-11-17", "not-a-date"])).toBe(
      `(created_ts >= timestamp(${range?.startTimestamp}) && created_ts < timestamp(${range?.endTimestamp}))`,
    );
    expect(buildDaysFilter("created_ts", [])).toBeUndefined();
  });

  it("selects on the view's time basis alongside other filters", () => {
    const filter = buildMemoFilter({
      filters: [
        { factor: "tagSearch", value: "work" },
        { factor: "onThisDay", value: getMonthDay() },
      ],
      includePinned: false,
      timeBasis: "update_time",
    });
    expect(filter).toMatch(/^\(tag in \["work"\]\) && \(\(updated_ts >= timestamp\(\d+\) && updated_ts < timestamp\(\d+\)\) \|\| /);
    expect(filter).not.toContain("created_ts");
  });

  it("ignores a malformed value", () => {
    expect(buildMemoFilter({ filters: [{ factor: "onThisDay", value: "nope" }], includePinned: false })).toBeUndefined();
  });
});

const Harness = () => {
  const location = useLocation();
  const navigateToDate = useDateFilterNavigation();
  return (
    <>
      <output data-testid="search">{location.search}</output>
      <button type="button" onClick={() => navigateToDate("2026-08-02")}>
        Select date
      </button>
    </>
  );
};

describe("picking a calendar day", () => {
  it("replaces an active On this day filter", async () => {
    render(
      <MemoryRouter initialEntries={["/?filter=onThisDay%3A11-17%2CtagSearch%3Awork"]}>
        <MemoFilterProvider>
          <Harness />
        </MemoFilterProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select date" }));

    await waitFor(() => {
      const params = new URLSearchParams(screen.getByTestId("search").textContent ?? "");
      expect(params.get("filter")).toBe("tagSearch:work,displayTime:2026-08-02");
    });
  });
});
