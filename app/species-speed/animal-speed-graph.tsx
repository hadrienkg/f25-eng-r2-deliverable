/* eslint-disable */
"use client";
import { max } from "d3-array";
import { axisBottom, axisLeft } from "d3-axis";
import { csv } from "d3-fetch";
import { scaleBand, scaleLinear, scaleOrdinal } from "d3-scale";
import { select } from "d3-selection";
import { useEffect, useRef, useState } from "react";

// Example data: Only the first three rows are provided as an example
// Add more animals or change up the style as you desire

interface AnimalDatum {
  animal: string;
  diet: "carnivore" | "herbivore" | "omnivore";
  speedKMh: number;
}

interface DietAverageDatum {
  diet: "carnivore" | "herbivore" | "omnivore";
  averageSpeed: number;
  count: number;
}

export default function AnimalSpeedGraph() {
  // useRef creates a reference to the div where D3 will draw the chart.
  // https://react.dev/reference/react/useRef
  const graphRef = useRef<HTMLDivElement>(null);

  const [animalData, setAnimalData] = useState<AnimalDatum[]>([]);
  const [viewMode, setViewMode] = useState<"diet" | "individual">("individual");

  // Load CSV data
  useEffect(() => {
    csv("/sample_animals.csv").then((data) => {
      const parsed: AnimalDatum[] = data
        .map((row) => ({
          animal: row.Animal || "",
          diet: (row.Diet?.toLowerCase().trim() || "omnivore") as "carnivore" | "herbivore" | "omnivore",
          speedKMh: parseFloat(row["Average Speed (km/h)"] || "0"),
        }))
        .filter((item) => item.animal && item.speedKMh > 0);

      setAnimalData(parsed);
    });
  }, []);

  useEffect(() => {
    // Clear any previous SVG to avoid duplicates when React hot-reloads
    if (graphRef.current) {
      graphRef.current.innerHTML = "";
    }

    if (animalData.length === 0) return;

    // Set up chart dimensions and margins
    const containerWidth = graphRef.current?.clientWidth ?? 800;
    const containerHeight = graphRef.current?.clientHeight ?? 500;

    // Set up chart dimensions and margins
    const width = Math.max(containerWidth, 600); // Minimum width of 600px
    const height = Math.max(containerHeight, 400); // Minimum height of 400px
    const margin = { top: 70, right: 60, bottom: viewMode === "individual" ? 120 : 100, left: 100 };

    // Create the SVG element where D3 will draw the chart
    const svg = select(graphRef.current!).append<SVGSVGElement>("svg").attr("width", width).attr("height", height);

    // Create a group element for the chart content (offset by margins)
    const chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Calculate inner dimensions
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Color scale: maps diet types to colors (ordinal scale)
    const colorScale = scaleOrdinal<string>()
      .domain(["carnivore", "herbivore", "omnivore"])
      .range(["#ef4444", "#22c55e", "#3b82f6"]); // red, green, blue

    if (viewMode === "diet") {
      // Calculate average speeds by diet type
      const dietGroups = animalData.reduce(
        (acc, animal) => {
          if (!acc[animal.diet]) {
            acc[animal.diet] = { totalSpeed: 0, count: 0 };
          }
          acc[animal.diet]!.totalSpeed += animal.speedKMh;
          acc[animal.diet]!.count += 1;
          return acc;
        },
        {} as Record<string, { totalSpeed: number; count: number }>,
      );

      const averageData: DietAverageDatum[] = Object.entries(dietGroups).map(([diet, data]) => ({
        diet: diet as "carnivore" | "herbivore" | "omnivore",
        averageSpeed: data.totalSpeed / data.count,
        count: data.count,
      }));

      // Create scales for diet view
      const xScale = scaleBand()
        .domain(averageData.map((d) => d.diet))
        .range([0, innerWidth])
        .padding(0.3);

      const yScale = scaleLinear()
        .domain([0, max(averageData, (d) => d.averageSpeed) || 100])
        .range([innerHeight, 0])
        .nice();

      // Create and add axes
      const xAxis = axisBottom(xScale);
      const yAxis = axisLeft(yScale);

      // Add X axis
      chart
        .append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(xAxis)
        .selectAll("text")
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "currentColor")
        .text((d) => {
          const diet = d as string;
          return diet.charAt(0).toUpperCase() + diet.slice(1);
        });

      // Add Y axis
      chart.append("g").call(yAxis);

      // Add Y axis label
      chart
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -innerHeight / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "currentColor")
        .text("Average Speed (km/h)");

      // Add chart title
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .style("fill", "currentColor")
        .text("Average Speed by Diet Type");

      // Create bars
      chart
        .selectAll("rect")
        .data(averageData)
        .enter()
        .append("rect")
        .attr("x", (d) => xScale(d.diet) || 0)
        .attr("y", (d) => yScale(d.averageSpeed))
        .attr("width", xScale.bandwidth())
        .attr("height", (d) => innerHeight - yScale(d.averageSpeed))
        .attr("fill", (d) => colorScale(d.diet))
        .attr("opacity", 0.8)
        .on("mouseover", function () {
          select(this).attr("opacity", 1);
        })
        .on("mouseout", function () {
          select(this).attr("opacity", 0.8);
        });

      // Add speed value labels on top of bars
      chart
        .selectAll(".speed-label")
        .data(averageData)
        .enter()
        .append("text")
        .attr("class", "speed-label")
        .attr("x", (d) => (xScale(d.diet) || 0) + xScale.bandwidth() / 2)
        .attr("y", (d) => yScale(d.averageSpeed) - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("fill", "currentColor")
        .text((d) => `${d.averageSpeed.toFixed(1)} km/h`);

      // Add count labels below title
      chart
        .selectAll(".count-label")
        .data(averageData)
        .enter()
        .append("text")
        .attr("class", "count-label")
        .attr("x", (d) => (xScale(d.diet) || 0) + xScale.bandwidth() / 2)
        .attr("y", innerHeight + 40)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("fill", "currentColor")
        .style("opacity", 0.6)
        .text((d) => `(n=${d.count})`);
    } else {
      // Individual animal view
      const xScale = scaleBand()
        .domain(animalData.map((d) => d.animal))
        .range([0, innerWidth])
        .padding(0.2);

      const yScale = scaleLinear()
        .domain([0, max(animalData, (d) => d.speedKMh) || 100])
        .range([innerHeight, 0])
        .nice();

      // Create and add axes
      const xAxis = axisBottom(xScale);
      const yAxis = axisLeft(yScale);

      // Add X axis
      chart
        .append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(xAxis)
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .style("font-size", "10px");

      // Add Y axis
      chart.append("g").call(yAxis);

      // Add Y axis label
      chart
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -innerHeight / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "currentColor")
        .text("Average Speed (km/h)");

      // Add chart title
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .style("fill", "currentColor")
        .text("Animal Speed Comparison");

      // Create bars
      chart
        .selectAll("rect")
        .data(animalData)
        .enter()
        .append("rect")
        .attr("x", (d) => xScale(d.animal) || 0)
        .attr("y", (d) => yScale(d.speedKMh))
        .attr("width", xScale.bandwidth())
        .attr("height", (d) => innerHeight - yScale(d.speedKMh))
        .attr("fill", (d) => colorScale(d.diet))
        .attr("opacity", 0.8)
        .on("mouseover", function () {
          select(this).attr("opacity", 1);
        })
        .on("mouseout", function () {
          select(this).attr("opacity", 0.8);
        });

      // Add legend
      const legend = svg.append("g").attr("transform", `translate(${width - margin.right - 120},${margin.top})`);

      const dietTypes = ["carnivore", "herbivore", "omnivore"];
      dietTypes.forEach((diet, i) => {
        const legendRow = legend.append("g").attr("transform", `translate(0,${i * 25})`);

        legendRow
          .append("rect")
          .attr("width", 15)
          .attr("height", 15)
          .attr("fill", colorScale(diet))
          .attr("opacity", 0.8);

        legendRow
          .append("text")
          .attr("x", 20)
          .attr("y", 12)
          .style("font-size", "12px")
          .style("fill", "currentColor")
          .text(diet.charAt(0).toUpperCase() + diet.slice(1));
      });
    }
  }, [animalData, viewMode]);

  return (
    <div className="h-full min-h-[600px] w-full p-4">
      <div className="mb-3 flex items-center justify-center">
        <div className="inline-flex rounded-lg border border-gray-300 bg-gray-100 p-1">
          <button
            onClick={() => setViewMode("diet")}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-all ${
              viewMode === "diet" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            By Diet Type
          </button>
          <button
            onClick={() => setViewMode("individual")}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-all ${
              viewMode === "individual" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            By Animal
          </button>
        </div>
      </div>
      <div ref={graphRef} className="h-full w-full" />
    </div>
  );
}
