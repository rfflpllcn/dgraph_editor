// set up SVG for D3
const width = 960;
const height = 500;
//const colors = d3.scaleOrdinal(d3.schemeCategory10);
const colors = {cash: "yellow", eq: "deepskyblue", ob: "lightgreen", aa: "gold", fx: "red"};
const confidenceColors = {1: "lime", 2: "cyan", 3: "magenta"};

var xScale = d3.scaleOrdinal()
    .domain([0, 1, 2])
    .range([250, 500, 750   ]);

var foci = {
    "first" : {
        "x" : xScale(0),
        "y": height / 2
    },
    "second": {
        "x" : xScale(1),
        "y": height / 2
    },
    "third": {
        "x" : xScale(2),
        "y": height / 2
    }
};

var forceX = d3.forceX((d) => foci[d.group]["x"]);
var forceY = d3.forceY((d) => foci[d.group]["y"]);

const svg = d3.select('body')
    .append('svg')
    .attr('oncontextmenu', 'return false;')
    .attr('width', width)
    .attr('height', height);

// set up initial nodes and links
//  - nodes are known by 'id', not by index in array.
//  - reflexive edges are indicated on the node (as a bold black circle).
//  - links are always source < target; edge directions are set by 'left' and 'right'.
const nodes = [
    { id: 0, reflexive: false, name: "LIQ-CHF", type: "cash", group: "first"},
    { id: 1, reflexive: false, name: "EQ-WELT", type: "eq" , group: "first"},
    { id: 2, reflexive: false, name: "OB-WELT", type: "ob", group: "first" },
    { id: 3, reflexive: false, name: "EQ-CH", type: "eq", group: "first" },
    { id: 4, reflexive: false, name: "EQ-EMU", type: "eq", group: "first" },
    { id: 5, reflexive: false, name: "EQ-UK", type: "eq", group: "first" },
    { id: 6, reflexive: false, name: "EQ-US", type: "eq", group: "first" },
    { id: 7, reflexive: false, name: "OBL-CHF", type: "ob", group: "second" },
    { id: 8, reflexive: false, name: "OBL-EUR", type: "ob", group: "second" },
    { id: 9, reflexive: false, name: "OBL-UK", type: "ob", group: "second" },
    { id: 10, reflexive: false, name: "OBL-US", type: "ob", group: "second" },
    { id: 11, reflexive: false, name: "GOLD", type: "aa", group: "second" },
    { id: 12, reflexive: false, name: "COMM", type: "aa", group: "second" },
    { id: 13, reflexive: false, name: "REAL", type: "aa", group: "second" },
    { id: 14, reflexive: false, name: "CHF", type: "fx", group: "third" },
    { id: 15, reflexive: false, name: "EUR", type: "fx", group: "third" },
    { id: 16, reflexive: false, name: "GBP", type: "fx", group: "third" },
    { id: 17, reflexive: false, name: "USD", type: "fx", group: "third" },
    { id: 18, reflexive: false, name: "AUD", type: "fx", group: "third" },
];
let lastNodeId = 2;
// const links = [
//     { source: nodes[0], target: nodes[1], left: false, right: true },
//     { source: nodes[1], target: nodes[2], left: false, right: true }
// ];
const links = [];

// init D3 force layout
const force = d3.forceSimulation()
    .force('link', d3.forceLink().id((d) => d.id).distance(100)) //forceLink: for creating a fixed distance between connected elements
    .force('charge', d3.forceManyBody().strength(-300)) //forceManyBody: for making elements attract or repel one another
    // .force('x', d3.forceX(width / 2))
    // .force('y', d3.forceY(height / 2))
    //.velocityDecay(0.65)
    .force('x', forceX)
    .force('y', forceY)

    //.force('center', d3.forceCenter(100, 100))
    .on('tick', tick);

// init D3 drag support
const drag = d3.drag()
    .on('start', (d) => {
        if (!d3.event.active) force.alphaTarget(1.0).restart();

        d.fx = d.x;
        d.fy = d.y;
    })
    .on('drag', (d) => {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    })
    .on('end', (d) => {
        if (!d3.event.active) force.alphaTarget(0.);

        d.fx = null;
        d.fy = null;
    });

// define arrow markers for graph links
svg.append('svg:defs').append('svg:marker')
    .attr('id', 'end-arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 6)
    .attr('markerWidth', 3)
    .attr('markerHeight', 3)
    .attr('orient', 'auto')
    .append('svg:path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#000');

svg.append('svg:defs').append('svg:marker')
    .attr('id', 'start-arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 4)
    .attr('markerWidth', 3)
    .attr('markerHeight', 3)
    .attr('orient', 'auto')
    .append('svg:path')
    .attr('d', 'M10,-5L0,0L10,5')
    .attr('fill', '#000');

// line displayed when dragging new nodes
const dragLine = svg.append('svg:path')
    .attr('class', 'link dragline hidden')
    .attr('d', 'M0,0L0,0');

// handles to link and node element groups
let path = svg.append('svg:g').selectAll('path');
let circle = svg.append('svg:g').selectAll('g');

// mouse event vars
let selectedNode = null;
let selectedLink = null;
let mousedownLink = null;
let mousedownNode = null;
let mouseupNode = null;
let mouseoverNode = null;

function resetMouseVars() {
    mousedownNode = null;
    mouseupNode = null;
    mousedownLink = null;
    mouseoverNode = null;
}


// update force layout (called automatically each iteration)
function tick() {
    // draw directed edges with proper padding from node centers
    path.attr('d', (d) => {
        const deltaX = d.target.x - d.source.x;
        const deltaY = d.target.y - d.source.y;
        const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const normX = deltaX / dist;
        const normY = deltaY / dist;
        const sourcePadding = d.left ? 17 : 12;
        const targetPadding = d.right ? 17 : 12;
        const sourceX = d.source.x + (sourcePadding * normX);
        const sourceY = d.source.y + (sourcePadding * normY);
        const targetX = d.target.x - (targetPadding * normX);
        const targetY = d.target.y - (targetPadding * normY);

        return `M${sourceX},${sourceY}L${targetX},${targetY}`;
    });

    circle.attr('transform', (d) => `translate(${d.x},${d.y})`);
}

// update graph (called when needed)
function restart() {
    // path (link) group
    path = path.data(links);

    console.log("selectedLink", selectedLink);

    // update existing links
    path.classed('selected', (d) => d === selectedLink)
        .style('marker-start', (d) => d.left ? 'url(#start-arrow)' : '')
        .style('marker-end', (d) => d.right ? 'url(#end-arrow)' : '')
        .style("stroke", (d) => confidenceColors[d.confidence]);

    // remove old links
    path.exit().remove();

    // add new links
    path = path.enter().append('svg:path')
        .attr('class', 'link')
        .classed('selected', (d) => d === selectedLink)
        .style('marker-start', (d) => d.left ? 'url(#start-arrow)' : '')
        .style('marker-end', (d) => d.right ? 'url(#end-arrow)' : '')
        //.attr("stroke", 'red')
        .style("stroke", (d) => confidenceColors[d.confidence])
        .on('mousedown', (d) => {
            if (d3.event.ctrlKey) return;

            // select link
            mousedownLink = d;
            selectedLink = (mousedownLink === selectedLink) ? null : mousedownLink;
            selectedNode = null;
            restart();
        })
        .merge(path);

    // circle (node) group
    // NB: the function arg is crucial here! nodes are known by id, not by index!
    circle = circle.data(nodes, (d) => d.id);

    // update existing nodes (reflexive & selected visual states)
    circle.selectAll('circle')
        //.style('fill', (d) => (d === selectedNode) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id))
        .style('fill', (d) => (d === selectedNode) ? d3.rgb(colors[d.type]).brighter().toString() : colors[d.type])
        .classed('reflexive', (d) => d.reflexive);

    // remove old nodes
    circle.exit().remove();

    // add new nodes
    const g = circle.enter().append('svg:g');

    g.append('svg:circle')
        .attr('class', 'node')
        .attr('r', 12)
        //.style('fill', (d) => (d === selectedNode) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id))
        .style('fill', (d) => (d === selectedNode) ? d3.rgb(colors[d.type]).brighter().toString() : colors[d.type])
        //.style('stroke', (d) => d3.rgb(colors(d.id)).darker().toString())
        .style('stroke', (d) => d3.rgb(colors[d.type]).darker().toString())
        .classed('reflexive', (d) => d.reflexive)
        .on('mouseover', mouseover)
        .on('mouseout', mouseout)
        .on('mousedown', (d) => {
            if (d3.event.ctrlKey) return;

            // select node
            mousedownNode = d;
            selectedNode = (mousedownNode === selectedNode) ? null : mousedownNode;
            selectedLink = null;

            // reposition drag line
            dragLine
                .style('marker-end', 'url(#end-arrow)')
                .classed('hidden', false)
                .attr('d', `M${mousedownNode.x},${mousedownNode.y}L${mousedownNode.x},${mousedownNode.y}`);

            restart();
        })
        .on('mouseup', function (d) {
            if (!mousedownNode) return;

            // needed by FF
            dragLine
                .classed('hidden', true)
                .style('marker-end', '');

            // check for drag-to-self
            mouseupNode = d;
            console.log(mouseupNode);
            console.log(mousedownNode);
            if (mouseupNode === mousedownNode) {
                resetMouseVars();
                return;
            }

            // unenlarge target node
            d3.select(this).attr('transform', '');

            // add link to graph (update if exists)
            // NB: links are strictly source < target; arrows separately specified by booleans
            const isRight = mousedownNode.id < mouseupNode.id;
            const source = isRight ? mousedownNode : mouseupNode;
            const target = isRight ? mouseupNode : mousedownNode;

            const link = links.filter((l) => l.source === source && l.target === target)[0];
            if (link) {
                link[isRight ? 'right' : 'left'] = true;
            } else {
                console.log(source);
                links.push({ source, target, left: !isRight, right: isRight, confidence: 1 });
            }

            // select new link
            selectedLink = link;
            selectedNode = null;
            restart();
        });


    function mouseover(d) {
        console.log("over", d);
        mouseoverNode = d;
        d3.select(this).transition()
            .duration(750)
            .attr("r", 16);
    }


// .on('mouseout', function (d) {
//         console.log("mouseout", d === mouseoverNode)
//         if (d === mouseoverNode) {mouseout;}
//         if (!mousedownNode || d === mousedownNode) return;
//         // unenlarge target node
//         d3.select(this).attr('transform', '');
//     })

    function mouseout(d) {
        console.log("out", mouseoverNode);
        //if (!mousedownNode || d === mousedownNode) return;
        // unenlarge target node
        //d3.select(this).attr('transform', '');

        mouseoverNode = null;
        d3.select(this).transition()
            .duration(750)
            .attr("r", 12);
    }

    // show node name
    g.append('svg:text')
        // .attr('x', 4)
        // .attr('y', 4)
        .attr("dx", 15)
        .attr("dy", ".35em")
        .attr('class', 'id')
        .text((d) => d.name);

    circle = g.merge(circle);

    // set the graph in motion
    force
        .nodes(nodes)
        .force('link').links(links);

    force.alphaTarget(0.3).restart();
}

function mousedown() {
    // because :active only works in WebKit?
    svg.classed('active', true);

    if (d3.event.ctrlKey || mousedownNode || mousedownLink) return;

    // insert new node at point
    const point = d3.mouse(this);
    const node = { id: ++lastNodeId, reflexive: false, x: point[0], y: point[1] };
    nodes.push(node);

    restart();
}

function mousemove() {
    if (!mousedownNode) return;

    // update drag line
    dragLine.attr('d', `M${mousedownNode.x},${mousedownNode.y}L${d3.mouse(this)[0]},${d3.mouse(this)[1]}`);

    restart();
}

function mouseup() {
    if (mousedownNode) {
        // hide drag line
        dragLine
            .classed('hidden', true)
            .style('marker-end', '');
    }

    // because :active only works in WebKit?
    svg.classed('active', false);

    // clear mouse event vars
    resetMouseVars();
}

function spliceLinksForNode(node) {
    const toSplice = links.filter((l) => l.source === node || l.target === node);
    for (const l of toSplice) {
        links.splice(links.indexOf(l), 1);
    }
}

// only respond once per keydown
let lastKeyDown = -1;

function keydown() {
    d3.event.preventDefault();

    if (lastKeyDown !== -1) return;
    lastKeyDown = d3.event.keyCode;

    // ctrl
    if (d3.event.keyCode === 17) {
        circle.call(drag);
        svg.classed('ctrl', true);
    }

    if (!selectedNode && !selectedLink) return;

    switch (d3.event.keyCode) {
        case 8: // backspace
        case 46: // delete
            if (selectedNode) {
                nodes.splice(nodes.indexOf(selectedNode), 1);
                spliceLinksForNode(selectedNode);
            } else if (selectedLink) {
                links.splice(links.indexOf(selectedLink), 1);
            }
            selectedLink = null;
            selectedNode = null;
            restart();
            break;
        case 66: // B
            if (selectedLink) {
                // set link direction to both left and right
                selectedLink.left = true;
                selectedLink.right = true;
            }
            restart();
            break;
        case 76: // L
            if (selectedLink) {
                // set link direction to left only
                selectedLink.left = true;
                selectedLink.right = false;
            }
            restart();
            break;
        case 82: // R
            if (selectedNode) {
                // toggle node reflexivity
                selectedNode.reflexive = !selectedNode.reflexive;
            } else if (selectedLink) {
                // set link direction to right only
                selectedLink.left = false;
                selectedLink.right = true;
            }
            restart();
            break;
        case 49: // 1
            if (selectedLink) {
                selectedLink.confidence = 1;
            }
            restart();
            break;
        case 50: // 2
            if (selectedLink) {
                selectedLink.confidence = 2;
            }
            restart();
            break;
        case 51: // 3
            if (selectedLink) {
                selectedLink.confidence = 3;
            }
            restart();
            break;
    }
}

function keyup() {
    lastKeyDown = -1;

    // ctrl
    if (d3.event.keyCode === 17) {
        circle.on('.drag', null);
        svg.classed('ctrl', false);
    }
}

// app starts here
svg.on('mousedown', mousedown)
    .on('mousemove', mousemove)
    .on('mouseup', mouseup);
d3.select(window)
    .on('keydown', keydown)
    .on('keyup', keyup);
restart();