import React, { useMemo, useRef, useEffect } from "react";
import {
  select,
  scaleTime,
  scaleLinear,
  line,
  area,
  curveMonotoneX,
  extent,
  max,
  axisBottom,
  axisLeft,
  timeFormat,
} from "d3";

interface MonthlyChartProps {
  groups: [string, { label: string; count: number }][];
  onPointClick?: (monthKey: string) => void;
  isLarge?: boolean;
}

const MonthlyChart: React.FC<MonthlyChartProps> = ({
  groups,
  onPointClick,
  isLarge = false,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const sortedData = useMemo(() => {
    return [...groups]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, val]) => ({
        key,
        date: new Date(key + "-01"),
        count: val.count,
        label: val.label,
      }));
  }, [groups]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svgElement = select(svgRef.current);
    svgElement.selectAll("*").remove();

    if (sortedData.length < 2) return;

    const margin = isLarge
      ? { top: 40, right: 40, bottom: 60, left: 60 }
      : { top: 20, right: 10, bottom: 25, left: 10 };

    const containerWidth = svgRef.current.parentElement?.clientWidth || 300;
    const width = isLarge ? Math.max(900, containerWidth) : containerWidth;
    const height = isLarge ? 400 : 120;

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = svgElement
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = scaleTime()
      .domain(extent(sortedData, (d) => d.date) as [Date, Date])
      .range([0, innerWidth]);

    const yScale = scaleLinear()
      .domain([0, (max(sortedData, (d) => d.count) || 0) * 1.1])
      .range([innerHeight, 0]);

    const lineGenerator = line<any>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.count))
      .curve(curveMonotoneX);

    const areaGenerator = area<any>()
      .x((d) => xScale(d.date))
      .y0(innerHeight)
      .y1((d) => yScale(d.count))
      .curve(curveMonotoneX);

    const gradientId = `area-gradient-${isLarge ? "large" : "small"}`;
    const defs = svgElement.append("defs");
    const gradient = defs
      .append("linearGradient")
      .attr("id", gradientId)
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#6366f1")
      .attr("stop-opacity", 0.4);
    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#6366f1")
      .attr("stop-opacity", 0);

    svg
      .append("path")
      .datum(sortedData)
      .attr("fill", `url(#${gradientId})`)
      .attr("d", areaGenerator);

    svg
      .append("path")
      .datum(sortedData)
      .attr("fill", "none")
      .attr("stroke", "#4f46e5")
      .attr("stroke-width", isLarge ? 3 : 2)
      .attr("d", lineGenerator);

    if (isLarge) {
      svg
        .append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(
          axisBottom(xScale)
            .ticks(Math.min(sortedData.length, 12))
            .tickFormat(timeFormat("%Y-%m") as any)
        )
        .attr("color", "#9ca3af")
        .selectAll("text")
        .attr("transform", "rotate(-30)")
        .style("text-anchor", "end")
        .style("font-size", "11px");

      svg
        .append("g")
        .call(axisLeft(yScale).ticks(5))
        .attr("color", "#9ca3af")
        .style("font-size", "11px");

      svg
        .append("g")
        .attr("class", "grid")
        .attr("opacity", 0.05)
        .call(
          axisLeft(yScale)
            .ticks(5)
            .tickSize(-innerWidth)
            .tickFormat(() => "")
        );
    }

    const points = svg
      .selectAll(".dot")
      .data(sortedData)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", (d) => xScale(d.date))
      .attr("cy", (d) => yScale(d.count))
      .attr("r", isLarge ? 6 : 4)
      .attr("fill", "#fff")
      .attr("stroke", "#4f46e5")
      .attr("stroke-width", isLarge ? 2.5 : 2)
      .style("cursor", "pointer")
      .on("mouseover", function () {
        select(this as any)
          .transition()
          .duration(200)
          .attr("r", isLarge ? 10 : 7)
          .attr("fill", "#4f46e5");
      })
      .on("mouseout", function () {
        select(this as any)
          .transition()
          .duration(200)
          .attr("r", isLarge ? 6 : 4)
          .attr("fill", "#fff");
      })
      .on("click", (event, d) => {
        event.stopPropagation();
        if (onPointClick) onPointClick(d.key);
      });

    points.append("title").text((d) => `${d.label}: ${d.count} 条动态`);
  }, [sortedData, isLarge, onPointClick]);

  return (
    <div
      className={`${
        isLarge
          ? ""
          : "bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-indigo-100 transition-colors group cursor-pointer"
      }`}
    >
      {!isLarge && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
            <svg
              className="w-3.5 h-3.5 text-indigo-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
              />
            </svg>
            发布频率趋势
          </h3>
          <span className="text-[9px] text-indigo-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
            点击展开交互视图
          </span>
        </div>
      )}

      <div className="relative">
        {sortedData.length < 2 ? (
          <div
            className={`flex flex-col items-center justify-center text-xs text-gray-300 italic ${
              isLarge ? "h-64" : "h-24"
            }`}
          >
            <svg
              className="w-8 h-8 mb-2 opacity-20"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            {groups.length === 0 ? "暂无数据" : "数据跨度不足以生成趋势线"}
          </div>
        ) : (
          <svg ref={svgRef} className="block overflow-visible w-full"></svg>
        )}
      </div>

      {!isLarge && sortedData.length >= 2 && (
        <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center text-[9px] text-gray-400">
          <span>{sortedData[0].label} 起</span>
          <span className="font-bold text-indigo-600">
            月峰值: {max(sortedData, (d) => d.count)} 条
          </span>
        </div>
      )}
    </div>
  );
};

export default MonthlyChart;
