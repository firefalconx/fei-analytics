console.log("Loading....")

const DATA_INTERVAL_SEC = 600;
const FEI_SURPLUS_REFRESH_SEC = 1;

let range = function(start, stop, step) {
    let distance = (stop - start) / (step - 1)
    let array = []
    for (let i = 0; i < step; i++) {
        array.push(start + (i * distance))
    }
    return array;
}

// Main function be ran on set interval
function main() {
    $.get("/refresh", function(data) {

        let trail_block_profit = data.fei_metadata.trail_block_profit;
        let new_block_profit = data.fei_metadata.new_block_profit;
        let cumulative_profit = data.fei_metadata.cumulative_profit;

        $('#cr').text(data.cr);
        $('#fei_usd').text(data.fei_usd_oracle_price);

        console.log("Refreshing graphs..")
        draw(data.timestamp_ct, "#cr_graph", "collaterization_ratio");
        draw(data.timestamp_ct, "#pcv_eth", "total_eth_pcv");
        draw(data.timestamp_ct, "#fei_usd_price", "fei_usd_oracle_price");
        draw(data.timestamp_ct, "#circulating_fei", "circulating_fei");

        let fei_surplus_interval = range(cumulative_profit, cumulative_profit + new_block_profit, DATA_INTERVAL_SEC)
        console.log(data)
        console.log(fei_surplus_interval)

        setInterval(function() {
            let class_index = "class-0";
            var spanClass = $('#fei_surplus').attr('class');

            if (spanClass === undefined) {
                $('#fei_surplus').addClass(class_index);
                spanClass = 0
            } else {
                spanClass = parseInt(spanClass.split("-")[1])
                if (spanClass < fei_surplus_interval.length) {
                    spanClass = (spanClass + 1);
                }
                $('#fei_surplus').removeClass();
                $('#fei_surplus').addClass("class-" + spanClass);
            }

            $('#fei_surplus').text(fei_surplus_interval[spanClass]);

        }, FEI_SURPLUS_REFRESH_SEC * 1000);

    });

    // Repeat Updates
    setTimeout(main, DATA_INTERVAL_SEC * 1000);
}

main();

let draw = function(data, id_selector, selector) {
    var margin = {
            top: 10,
            right: 30,
            bottom: 30,
            left: 80
        },
        width = 460 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    /// Reset SVG Image
    d3.select(id_selector).select("svg").remove();

    var svg = d3.select(id_selector)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    for (let i = 0; i < data.length; i++) {
        data[i].date = new Date(data[i].date)
    }

    var x = d3.scaleTime()
        .domain(d3.extent(data, function(d) {
            return d.date;
        }))
        .range([0, width]);
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

    var y = d3.scaleLinear()
        .domain([d3.min(data, function(d) {
            return +d[selector];
        }), d3.max(data, function(d) {
            return +d[selector];
        })])
        .range([height, 0]);
    svg.append("g")
        .call(d3.axisLeft(y));

    // Add the line
    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line()
            .x(function(d) {
                return x(d.date)
            })
            .y(function(d) {
                return y(d[selector])
            })
        )
}
