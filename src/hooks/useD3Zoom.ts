import { useEffect, useRef, useCallback } from "react";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior, type D3ZoomEvent } from "d3-zoom";
import "d3-transition";

export function useD3Zoom<E extends SVGSVGElement>() {
  const svgRef = useRef<E>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<E, unknown> | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const zoomBehavior = zoom<E, unknown>()
      .scaleExtent([0.2, 3])
      .on("zoom", (event: D3ZoomEvent<E, unknown>) => {
        select(svg).select<SVGGElement>("g.zoom-group").attr("transform", event.transform.toString());
      });

    select(svg).call(zoomBehavior);
    zoomBehaviorRef.current = zoomBehavior;

    // Disable built-in double-click zoom, we'll add our own fit-to-view
    select(svg).on("dblclick.zoom", null);

    return () => {
      select(svg).on(".zoom", null);
    };
  }, []);

  const fitToView = useCallback((
    nodes: Array<{ x: number; y: number }>,
    width: number,
    height: number,
    padding = 80
  ) => {
    const svg = svgRef.current;
    if (!svg || !zoomBehaviorRef.current || nodes.length === 0) return;

    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const minX = Math.min(...xs) - padding;
    const maxX = Math.max(...xs) + 160 + padding;
    const minY = Math.min(...ys) - padding;
    const maxY = Math.max(...ys) + 100 + padding;

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const scale = Math.min(width / contentWidth, height / contentHeight, 1);
    const tx = (width - contentWidth * scale) / 2 - minX * scale;
    const ty = (height - contentHeight * scale) / 2 - minY * scale;

    select(svg)
      .transition()
      .duration(500)
      .call(
        zoomBehaviorRef.current.transform,
        zoomIdentity.translate(tx, ty).scale(scale)
      );
  }, []);

  return { svgRef, fitToView };
}
