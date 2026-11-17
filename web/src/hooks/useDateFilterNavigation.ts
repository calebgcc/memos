import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { replaceFiltersByFactor, stringifyFilters, useMemoFilterContext } from "@/contexts/MemoFilterContext";

export const useDateFilterNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { filters, setFilters } = useMemoFilterContext();

  const navigateToDateFilter = useCallback(
    (date: string) => {
      // A picked day and "On this day" would AND into an empty list, so the day replaces both.
      const nextFilters = replaceFiltersByFactor(
        filters.filter((filter) => filter.factor !== "onThisDay"),
        "displayTime",
        [{ factor: "displayTime", value: date }],
      );
      const nextSearchParams = new URLSearchParams(location.search);
      nextSearchParams.set("filter", stringifyFilters(nextFilters));
      setFilters(nextFilters);
      navigate({ pathname: location.pathname, search: nextSearchParams.toString() });
    },
    [filters, location.pathname, location.search, navigate, setFilters],
  );

  return navigateToDateFilter;
};
