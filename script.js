// The dataset has been excluded from the file due to its size, as its inclusion would prevent it from being previewed on GitHub.


const width = 400; // Reduced width
const height = 300; // Reduced height
const margin = { top: 40, right: 60, bottom: 20, left: 20 }; // Adjusted top margin

let isBoxSelecting = false;
let startPoint = null;
let box = null;

// Function to create a plot
function createPlot(data, index) {
  const xScale = d3.scaleLinear()
    .domain([d3.min(data.x), d3.max(data.x)])
    .range([0, width - margin.left - margin.right]);

  const yScale = d3.scaleLinear()
    .domain([d3.min(data.y), d3.max(data.y)])
    .range([height - margin.top - margin.bottom, 0]);

  const colorScale = d3.scaleSequential()
    .interpolator(d3.interpolateRgb("rgb(220,220,220)", "rgb(255,0,0)"))
    .domain([d3.min(data.color), d3.max(data.color)]);

  const svg = d3.select("#plot-container")
    .append("div")
    .attr("class", "plot")
    .style("display", "inline-block") // Display plots side by side
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`)
    .on("mousedown", handleMouseDown)
    .on("mousemove", handleMouseMove)
    .on("mouseup", handleMouseUp);

  // Tooltip
  const tooltip = d3.select("#tooltip");

  // Add points
  svg.selectAll("circle")
    .data(data.x.map((d, i) => ({ x: d, y: data.y[i], color: data.color[i] })))
    .enter()
    .append("circle")
    .attr("cx", (d) => xScale(d.x))
    .attr("cy", (d) => yScale(d.y))
    .attr("r", 1.5) // Increased radius for better visibility
    .attr("fill", (d) => colorScale(d.color))
    .on("mouseover", function (event, d) {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip.html(`Log Normalised Value: ${d.color}<br>X1: ${d.x.toFixed(4)}<br>X2: ${d.y.toFixed(4)}`)
        .style("left", event.pageX + 5 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", function (d) {
      tooltip.transition().duration(500).style("opacity", 0);
    });

  // Hide axes
  svg.append("g")
    .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`)
    .call(d3.axisBottom(xScale).tickFormat("").tickSize(0))
    .attr("class", "axis")
    .select(".domain")
    .remove();

  svg.append("g")
    .call(d3.axisLeft(yScale).tickFormat("").tickSize(0))
    .attr("class", "axis")
    .select(".domain")
    .remove();

  // Remove individual legends
  const title = svg.append("text")
    .attr("x", (width - margin.left - margin.right) / 2)
    .attr("y", -10) // Adjusted to fit within the increased top margin
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text(`Plot ${index + 1}`);
}

// Loop through the dataset and create plots
dataset.forEach((data, index) => {
  createPlot(data, index);
});

// Create common legend
const commonLegendHeight = height; // Height to match plot height
const commonLegendWidth = 20;

const commonLegendSvg = d3.select("#legend-container")
  .append("svg")
  .attr("width", commonLegendWidth + margin.right)
  .attr("height", commonLegendHeight + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const commonLegendScale = d3.scaleLinear()
  .domain([
    d3.min(dataset, (d) => d3.min(d.color)),
    d3.max(dataset, (d) => d3.max(d.color)),
  ])
  .range([commonLegendHeight, 0]);

const commonLegendAxis = d3.axisRight(commonLegendScale).ticks(6);

const commonLegend = commonLegendSvg.append("g")
  .call(commonLegendAxis)
  .attr("transform", `translate(${commonLegendWidth}, 0)`); // Shift legend to the right

// Add color gradient
const gradient = commonLegendSvg.append("defs")
  .append("linearGradient")
  .attr("id", "gradient")
  .attr("x1", "0%")
  .attr("y1", "100%")
  .attr("x2", "0%")
  .attr("y2", "0%");

gradient.append("stop")
  .attr("offset", "0%")
  .attr("stop-color", "rgb(220,220,220)");

gradient.append("stop")
  .attr("offset", "100%")
  .attr("stop-color", "rgb(255,0,0)");

commonLegendSvg.append("rect")
  .attr("width", commonLegendWidth)
  .attr("height", commonLegendHeight)
  .style("fill", "url(#gradient)");

commonLegendSvg.append("text")
  .attr("x", commonLegendWidth / 2)
  .attr("y", -10) // Adjusted to fit better within the margin
  .attr("text-anchor", "middle")
  .style("font-size", "12px")
  .text("Legend");

// Adjust ticks position
commonLegend.selectAll(".tick text")
  .attr("x", 4) // Adjusted position of tick text to the right
  .style("text-anchor", "start"); // Adjusted text alignment

let selectedThreshold = null; // Track the currently selected threshold

commonLegend.selectAll(".tick").on("click", function () {
  const selectedValue = d3.select(this).datum();

  // If the same threshold is clicked again, reset to default plot
  if (selectedValue === selectedThreshold) {
    selectedThreshold = null; // Reset selectedThreshold
    resetPlot();
    return; // Exit the function
  }

  selectedThreshold = selectedValue; // Update selectedThreshold

  // Filter data points based on the selected threshold value
  const filteredData = dataset.map((data) => ({
    x: data.x.filter((d, i) => data.color[i] >= selectedValue),
    y: data.y.filter((d, i) => data.color[i] >= selectedValue),
    color: data.color.filter((d) => d >= selectedValue),
  }));

  // Update the plots with the filtered data
  updatePlots(filteredData);

  // Add marker to denote selected threshold value
  addThresholdMarker(selectedValue);
});

// Function to reset plots to default state
function resetPlot() {
  selectedThreshold = null;
  // Reset selectedThreshold
  updatePlots(dataset); // Update plots with default data
  commonLegendSvg.selectAll(".threshold-marker").remove(); // Remove existing marker
}

// Function to update plots with filtered data
function updatePlots(filteredData) {
  // Show loading animation
  showLoading();

  d3.selectAll(".plot").remove(); // Remove existing plots

  // Loop through the dataset and create plots with filtered data
  setTimeout(() => {
    filteredData.forEach((data, index) => {
      createPlot(data, index);
    });
    // Hide loading animation once plots are loaded
    hideLoading();
  }, 1000); // Simulating loading time
}

// Function to add marker for selected threshold value
function addThresholdMarker(selectedValue) {
  commonLegendSvg.selectAll(".threshold-marker").remove(); // Remove existing marker

  const marker = commonLegendSvg
    .append("line")
    .attr("class", "threshold-marker")
    .attr("x1", 0)
    .attr("y1", commonLegendScale(selectedValue))
    .attr("x2", commonLegendWidth)
    .attr("y2", commonLegendScale(selectedValue))
    .attr("stroke", "black")
    .attr("stroke-width", 1)
    .style("pointer-events", "none"); // Disable mouse events on marker

  // Add click event listener to marker to reset plots
  marker.on("click", resetPlot);
}

// Function to show loading animation
function showLoading() {
  d3.select("#loading-animation").style("display", "block");
}

// Function to hide loading animation
function hideLoading() {
  d3.select("#loading-animation").style("display", "none");
}

// Function to handle mouse down event for box selection
function handleMouseDown(event) {
  isBoxSelecting = true;
  startPoint = d3.pointer(event);
  box = d3
    .select(this)
    .append("rect")
    .attr("x", startPoint[0])
    .attr("y", startPoint[1])
    .attr("width", 0)
    .attr("height", 0)
    .attr("stroke", "black")
    .attr("stroke-width", 1)
    .attr("fill", "none");
}

// Function to handle mouse move event for box selection
function handleMouseMove(event) {
  if (!isBoxSelecting) return;
  const currentPoint = d3.pointer(event);
  const x = Math.min(startPoint[0], currentPoint[0]);
  const y = Math.min(startPoint[1], currentPoint[1]);
  const width = Math.abs(currentPoint[0] - startPoint[0]);
  const height = Math.abs(currentPoint[1] - startPoint[1]);
  box.attr("x", x).attr("y", y).attr("width", width).attr("height", height);
}

// Function to handle mouse up event for box selection
function handleMouseUp() {
  isBoxSelecting = false;
}


