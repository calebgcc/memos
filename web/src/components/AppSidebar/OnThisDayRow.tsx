import { HistoryIcon } from "lucide-react";
import { useMemo } from "react";
import { replaceFiltersByFactor, useMemoFilterContext } from "@/contexts/MemoFilterContext";
import { getMonthDay, getOnThisDayDates } from "@/lib/calendar-utils";
import { useTranslate } from "@/utils/i18n";
import SidebarRow from "./SidebarRow";

interface Props {
  /** Memo counts by `YYYY-MM-DD`, the same buckets the sidebar calendar draws. */
  activityStats: Record<string, number>;
  onSelect?: () => void;
}

/** Brings back what was written on today's date in earlier years; hidden until there is something to show. */
const OnThisDayRow = ({ activityStats, onSelect }: Props) => {
  const t = useTranslate();
  const { filters, setFilters } = useMemoFilterContext();
  const monthDay = getMonthDay();
  const count = useMemo(
    () => getOnThisDayDates(monthDay).reduce((total, date) => total + (activityStats[date] ?? 0), 0),
    [activityStats, monthDay],
  );
  const active = filters.some((filter) => filter.factor === "onThisDay");

  // Stay visible while checked so the filter can be turned off from where it was turned on.
  if (count === 0 && !active) return null;

  const handleClick = () => {
    if (active) {
      setFilters(filters.filter((filter) => filter.factor !== "onThisDay"));
    } else {
      // A picked day and "On this day" would AND into an empty list, so this replaces the day.
      setFilters(
        replaceFiltersByFactor(
          filters.filter((filter) => filter.factor !== "displayTime"),
          "onThisDay",
          [{ factor: "onThisDay", value: monthDay }],
        ),
      );
    }
    onSelect?.();
  };

  return (
    <SidebarRow state={active ? "checked" : "idle"} icon={HistoryIcon} label={t("memo.on-this-day")} count={count} onClick={handleClick} />
  );
};

export default OnThisDayRow;
