/* ============================================================
   The cable
   Measures every .tl-node on the page and threads one steel cable
   through the centre of the carabiners. Layout agnostic: the
   markup comes from Hugo, this file only draws the line.
   ============================================================ */
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  function smoothPath(points, tension) {
    if (points.length < 2) return "";
    var t = tension == null ? 1 : tension;
    var pts = points.slice();
    var first = pts[0];
    var last = pts[pts.length - 1];
    pts.unshift({ x: first.x, y: first.y - 60 });
    pts.push({ x: last.x, y: last.y + 60 });

    var d = "M " + pts[0].x.toFixed(2) + " " + pts[0].y.toFixed(2);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i];
      var p1 = pts[i];
      var p2 = pts[i + 1];
      var p3 = pts[i + 2] || p2;
      var c1x = p1.x + ((p2.x - p0.x) / 6) * t;
      var c1y = p1.y + ((p2.y - p0.y) / 6) * t;
      var c2x = p2.x - ((p3.x - p1.x) / 6) * t;
      var c2y = p2.y - ((p3.y - p1.y) / 6) * t;
      d +=
        " C " +
        c1x.toFixed(2) +
        " " +
        c1y.toFixed(2) +
        ", " +
        c2x.toFixed(2) +
        " " +
        c2y.toFixed(2) +
        ", " +
        p2.x.toFixed(2) +
        " " +
        p2.y.toFixed(2);
    }
    return d;
  }

  /* Sample the centre line, then weave two sine waves around it.
     The two strands are what makes the line read as twisted steel. */
  function braidPaths(svg, d, period, amplitude) {
    var probe = document.createElementNS(SVG_NS, "path");
    probe.setAttribute("d", d);
    probe.setAttribute("fill", "none");
    probe.setAttribute("stroke", "none");
    svg.appendChild(probe);

    var total = 0;
    try {
      total = probe.getTotalLength();
    } catch (e) {
      total = 0;
    }
    if (!total) {
      probe.remove();
      return "";
    }

    var step = 5;
    var a = [];
    var b = [];
    for (var s = 0; s <= total; s += step) {
      var p = probe.getPointAtLength(s);
      var q = probe.getPointAtLength(Math.min(s + 0.8, total));
      var tx = q.x - p.x;
      var ty = q.y - p.y;
      var len = Math.hypot(tx, ty) || 1;
      tx /= len;
      ty /= len;
      var nx = -ty;
      var ny = tx;
      var w = Math.sin((s / period) * Math.PI * 2) * amplitude;
      a.push([p.x + nx * w, p.y + ny * w]);
      b.push([p.x - nx * w, p.y - ny * w]);
    }
    probe.remove();

    function toPath(pts) {
      return pts
        .map(function (pt, i) {
          return (i ? "L" : "M") + pt[0].toFixed(1) + " " + pt[1].toFixed(1);
        })
        .join(" ");
    }

    return (
      '<path class="rope-strand" d="' +
      toPath(a) +
      '" />' +
      '<path class="rope-strand rope-strand--alt" d="' +
      toPath(b) +
      '" />'
    );
  }

  function buildCable(root) {
    var svg = root.querySelector(".tl-rope");
    if (!svg) return;

    var nodes = Array.prototype.slice.call(root.querySelectorAll(".tl-node"));
    if (!nodes.length) {
      svg.innerHTML = "";
      return;
    }

    var box = root.getBoundingClientRect();
    if (!box.width || !box.height) return;

    var points = nodes
      .map(function (node) {
        var b = node.getBoundingClientRect();
        return {
          x: b.left - box.left + b.width / 2,
          y: b.top - box.top + b.height / 2
        };
      })
      .sort(function (p, q) {
        return p.y - q.y || p.x - q.x;
      });

    svg.setAttribute("viewBox", "0 0 " + box.width.toFixed(0) + " " + box.height.toFixed(0));
    svg.setAttribute("width", box.width.toFixed(0));
    svg.setAttribute("height", box.height.toFixed(0));

    var d = smoothPath(points, 1);
    svg.innerHTML = '<path class="rope-shadow" d="' + d + '" /><path class="rope-line" d="' + d + '" />';

    var braid = braidPaths(svg, d, 9, 1.45);
    if (braid) svg.innerHTML += braid;
  }

  function debounce(fn, ms) {
    var id;
    return function () {
      clearTimeout(id);
      id = setTimeout(fn, ms);
    };
  }

  function mount(root) {
    var draw = debounce(function () {
      buildCable(root);
    }, 120);

    buildCable(root);
    window.addEventListener("resize", draw);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    if (window.ResizeObserver) new ResizeObserver(draw).observe(root);
  }

  function init() {
    var roots = document.querySelectorAll("[data-timeline]");
    Array.prototype.forEach.call(roots, function (root) {
      mount(root);
    });
  }

  window.Descent = { build: buildCable };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
