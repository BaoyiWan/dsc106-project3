const pointFile = "data/crop_precip_points.csv";
const summaryFile = "data/crop_zone_summary.csv";

const measureLabels = {
  precip_intensity: "Overall Precipitation Proxy",
  rain_proxy: "Rain Proxy",
  snow_proxy: "Snow Proxy"
};

const summaryColumns = {
  precip_intensity: "avg_precip",
  rain_proxy: "avg_rain",
  snow_proxy: "avg_snow"
};

const colorScale = d3.scaleOrdinal()
  .domain(["Non-Agricultural", "Sparse Crops", "Intense Cropland"])
  .range(["#bdbdbd", "#f2a65a", "#7a3e12"]);

const tooltip = d3.select("#tooltip");

let pointsData;
let summaryData;

Promise.all([
  d3.csv(pointFile, d => ({
    lon: +d.lon,
    lat: +d.lat,
    crop_density: +d.crop_density,
    precip_intensity: +d.precip_intensity,
    rain_proxy: +d.rain_proxy,
    snow_proxy: +d.snow_proxy,
    crop_zone: d.crop_zone
  })),
  d3.csv(summaryFile, d => ({
    crop_zone: d.crop_zone,
    avg_crop_density: +d.avg_crop_density,
    avg_precip: +d.avg_precip,
    avg_rain: +d.avg_rain,
    avg_snow: +d.avg_snow,
    count: +d.count
  }))
]).then(([points, summary]) => {
  pointsData = points;
  summaryData = summary;

  drawScatterplot();
  drawBarChart();

  d3.select("#measure-select").on("change", updateCharts);
  d3.select("#zone-select").on("change", updateCharts);
});

function updateCharts() {
  drawScatterplot();
  drawBarChart();
}

function getCurrentMeasure() {
  return d3.select("#measure-select").property("value");
}

function getCurrentZone() {
  return d3.select("#zone-select").property("value");
}

function getFilteredPoints() {
  const selectedZone = getCurrentZone();

  if (selectedZone === "All") {
    return pointsData;
  }

  return pointsData.filter(d => d.crop_zone === selectedZone);
}

function drawScatterplot() {
  const measure = getCurrentMeasure();
  const filtered = getFilteredPoints();

  d3.select("#scatterplot").selectAll("*").remove();

  const margin = { top: 40, right: 30, bottom: 70, left: 75 };
  const outerWidth = 720;
  const outerHeight = 500;
  const width = outerWidth - margin.left - margin.right;
  const height = outerHeight - margin.top - margin.bottom;

  const svg = d3.select("#scatterplot")
    .append("svg")
    .attr("viewBox", `0 0 ${outerWidth} ${outerHeight}`);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xMax = d3.max(pointsData, d => d[measure]) || 1;

  const x = d3.scaleLinear()
    .domain([0, xMax])
    .nice()
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, 255])
    .nice()
    .range([height, 0]);

  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  g.append("g")
    .call(d3.axisLeft(y));

  g.append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + 48)
    .attr("text-anchor", "middle")
    .text(measureLabels[measure]);

  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -52)
    .attr("text-anchor", "middle")
    .text("Cropland Density Proxy");

  g.selectAll("circle")
    .data(filtered)
    .join("circle")
    .attr("cx", d => x(d[measure]))
    .attr("cy", d => y(d.crop_density))
    .attr("r", 3)
    .attr("fill", d => colorScale(d.crop_zone))
    .attr("opacity", 0.45)
    .on("mouseover", function(event, d) {
      d3.select(this)
        .attr("r", 6)
        .attr("opacity", 0.9);

      tooltip
        .style("opacity", 1)
        .html(`
          <strong>${d.crop_zone}</strong><br>
          ${measureLabels[measure]}: ${d[measure].toFixed(2)}<br>
          Crop Density Proxy: ${d.crop_density.toFixed(2)}<br>
          Lon: ${d.lon.toFixed(2)}, Lat: ${d.lat.toFixed(2)}
        `);
    })
    .on("mousemove", function(event) {
      tooltip
        .style("left", `${event.pageX + 14}px`)
        .style("top", `${event.pageY - 28}px`);
    })
    .on("mouseout", function() {
      d3.select(this)
        .attr("r", 3)
        .attr("opacity", 0.45);

      tooltip.style("opacity", 0);
    });

  drawLegend(svg, outerWidth - 205, 28);
}

function drawLegend(svg, x, y) {
  const zones = ["Non-Agricultural", "Sparse Crops", "Intense Cropland"];

  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${x},${y})`);

  legend.append("rect")
    .attr("x", -10)
    .attr("y", -18)
    .attr("width", 170)
    .attr("height", 84)
    .attr("rx", 8)
    .attr("fill", "white")
    .attr("opacity", 0.85);

  zones.forEach((zone, i) => {
    const row = legend.append("g")
      .attr("transform", `translate(0,${i * 22})`);

    row.append("circle")
      .attr("r", 6)
      .attr("fill", colorScale(zone));

    row.append("text")
      .attr("x", 12)
      .attr("y", 4)
      .text(zone);
  });
}

function drawBarChart() {
  const measure = getCurrentMeasure();
  const selectedZone = getCurrentZone();
  const summaryCol = summaryColumns[measure];

  let data = summaryData;

  if (selectedZone !== "All") {
    data = summaryData.filter(d => d.crop_zone === selectedZone);
  }

  d3.select("#barchart").selectAll("*").remove();

  const margin = { top: 35, right: 25, bottom: 90, left: 70 };
  const outerWidth = 480;
  const outerHeight = 500;
  const width = outerWidth - margin.left - margin.right;
  const height = outerHeight - margin.top - margin.bottom;

  const svg = d3.select("#barchart")
    .append("svg")
    .attr("viewBox", `0 0 ${outerWidth} ${outerHeight}`);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(data.map(d => d.crop_zone))
    .range([0, width])
    .padding(0.25);

  const yMax = d3.max(summaryData, d => d[summaryCol]) || 1;

  const y = d3.scaleLinear()
    .domain([0, yMax])
    .nice()
    .range([height, 0]);

  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-25)")
    .attr("text-anchor", "end");

  g.append("g")
    .call(d3.axisLeft(y));

  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -48)
    .attr("text-anchor", "middle")
    .text(`Average ${measureLabels[measure]}`);

  g.selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", d => x(d.crop_zone))
    .attr("y", d => y(d[summaryCol]))
    .attr("width", x.bandwidth())
    .attr("height", d => height - y(d[summaryCol]))
    .attr("fill", d => colorScale(d.crop_zone))
    .on("mouseover", function(event, d) {
      d3.select(this).attr("opacity", 0.75);

      tooltip
        .style("opacity", 1)
        .html(`
          <strong>${d.crop_zone}</strong><br>
          Average ${measureLabels[measure]}: ${d[summaryCol].toFixed(2)}<br>
          Average Crop Density: ${d.avg_crop_density.toFixed(2)}<br>
          Pixels: ${d.count}
        `);
    })
    .on("mousemove", function(event) {
      tooltip
        .style("left", `${event.pageX + 14}px`)
        .style("top", `${event.pageY - 28}px`);
    })
    .on("mouseout", function() {
      d3.select(this).attr("opacity", 1);
      tooltip.style("opacity", 0);
    });

  g.selectAll(".bar-label")
    .data(data)
    .join("text")
    .attr("class", "bar-label")
    .attr("x", d => x(d.crop_zone) + x.bandwidth() / 2)
    .attr("y", d => y(d[summaryCol]) - 8)
    .attr("text-anchor", "middle")
    .text(d => d[summaryCol].toFixed(1));
}