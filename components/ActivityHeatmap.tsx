
import React, { useEffect, useRef } from 'react';
// Import specific D3 modules to resolve property access issues in the TypeScript environment
import { 
  select, 
  timeMonth, 
  timeSunday, 
  timeDays, 
  timeDay, 
  timeWeek, 
  timeFormat, 
  scaleThreshold, 
  timeMonths 
} from 'd3';
import { ActivityData } from '../types';

interface ActivityHeatmapProps {
  data: ActivityData[];
  startDateProp?: string;
  endDateProp?: string;
  onCellClick?: (date: string) => void;
  isLarge?: boolean;
}

const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ 
  data, 
  startDateProp, 
  endDateProp, 
  onCellClick,
  isLarge = false 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Fix: Use the named 'select' function to clear the SVG content
    select(svgRef.current).selectAll("*").remove();

    const margin = isLarge 
      ? { top: 40, right: 20, bottom: 20, left: 40 }
      : { top: 25, right: 10, bottom: 5, left: 30 };
      
    const cellSize = isLarge ? 16 : 10;
    const cellPadding = isLarge ? 4 : 2;
    const height = isLarge ? 180 : 110;

    const end = endDateProp ? new Date(endDateProp) : new Date();
    end.setHours(0, 0, 0, 0);
    
    // Fix: Use named 'timeMonth' and 'timeSunday'
    const start = startDateProp ? new Date(startDateProp) : timeMonth.offset(end, -3);
    const startDate = timeSunday.floor(start); 
    
    // Fix: Use named 'timeDays' and 'timeDay'
    const dates = timeDays(startDate, timeDay.offset(end, 1));
    const totalWeeks = timeWeek.count(startDate, end) + 1;
    const width = totalWeeks * (cellSize + cellPadding) + margin.left + margin.right;

    // Fix: Use named 'select' to initialize the SVG group
    const svg = select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", isLarge ? width : "100%")
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Fix: Use named 'timeFormat'
    const formatDay = timeFormat("%Y-%m-%d");
    const dataMap = new Map(data.map(d => [d.date, d.count]));

    // Fix: Use named 'scaleThreshold'
    const colorScale = scaleThreshold<number, string>()
      .domain([1, 2, 5, 10])
      .range(["#f3f4f6", "#c7d2fe", "#818cf8", "#4f46e5", "#3730a3"]);

    const dayRects = svg.selectAll(".day")
      .data(dates)
      .enter()
      .append("rect")
      .attr("class", "day")
      .attr("width", cellSize)
      .attr("height", cellSize)
      .attr("x", d => timeWeek.count(startDate, d) * (cellSize + cellPadding))
      .attr("y", d => d.getDay() * (cellSize + cellPadding))
      .attr("fill", d => {
        const dateStr = formatDay(d);
        const count = dataMap.get(dateStr) || 0;
        return colorScale(count);
      })
      .attr("rx", isLarge ? 3 : 1.5)
      .attr("stroke", "rgba(0,0,0,0.03)")
      .attr("stroke-width", 1);

    if (onCellClick) {
      dayRects
        .style("cursor", "pointer")
        .on("mouseover", function() {
          // Fix: Use named 'select' with 'this' context for hovering effects
          select(this as any).attr("stroke", "#4f46e5").attr("stroke-width", 2);
        })
        .on("mouseout", function() {
          // Fix: Use named 'select' with 'this' context to reset stroke
          select(this as any).attr("stroke", "rgba(0,0,0,0.03)").attr("stroke-width", 1);
        })
        .on("click", (event, d) => {
          onCellClick(formatDay(d));
        });
    }

    dayRects.append("title")
      .text(d => {
        const dateStr = d.toLocaleDateString();
        const count = dataMap.get(formatDay(d)) || 0;
        return `${dateStr}: ${count} 条动态`;
      });

    // Fix: Use named 'timeMonths' to generate labels
    const monthLabels = timeMonths(startDate, end);
    svg.selectAll(".month-label")
      .data(monthLabels)
      .enter()
      .append("text")
      .attr("x", d => timeWeek.count(startDate, d) * (cellSize + cellPadding))
      .attr("y", -10)
      .attr("font-size", isLarge ? "12px" : "8px")
      .attr("fill", "#6b7280")
      .attr("font-weight", "600")
      .text(d => timeFormat("%b %Y")(d));

    const days = ["日", "一", "二", "三", "四", "五", "六"];
    [1, 3, 5].forEach(i => {
      svg.append("text")
        .attr("x", -margin.left + 5)
        .attr("y", i * (cellSize + cellPadding) + (cellSize / 1.2))
        .attr("font-size", isLarge ? "10px" : "8px")
        .attr("fill", "#9ca3af")
        .text(days[i]);
    });

  }, [data, startDateProp, endDateProp, isLarge, onCellClick]);

  return (
    <div className={`${isLarge ? '' : 'bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-indigo-100 transition-colors cursor-pointer group'}`}>
      {!isLarge && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
            <svg className="w-3 h-3 text-indigo-400 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            历史活跃趋势
          </h3>
          <span className="text-[9px] text-indigo-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">点击展开交互视图</span>
        </div>
      )}
      <div className={`overflow-x-auto pb-1 custom-scrollbar ${isLarge ? 'py-4' : ''}`}>
        <svg ref={svgRef} className={isLarge ? "" : "min-w-[240px]"}></svg>
      </div>
      <div className={`flex items-center justify-end gap-1 mt-2 text-[8px] text-gray-300 ${isLarge ? 'text-[10px] pr-4' : ''}`}>
        <span>少</span>
        {[0, 2, 5, 10].map((v, i) => (
          <div key={i} className={`${isLarge ? 'w-4 h-4' : 'w-2 h-2'} rounded-sm`} style={{ 
            backgroundColor: i === 0 ? "#f3f4f6" : 
                             i === 1 ? "#818cf8" : 
                             i === 2 ? "#4f46e5" : "#3730a3" 
          }} />
        ))}
        <span>多</span>
      </div>
    </div>
  );
};

export default ActivityHeatmap;
