import { useEffect, useMemo, useCallback } from "react";
import { useFamilyTree } from "../context/FamilyTreeContext";
import { computeKinshipDegrees } from "../engine/kinship";
import { computeLayout } from "../engine/layout";
import { useD3Zoom } from "../hooks/useD3Zoom";

export default function TreeCanvas() {
  const { state, dispatch } = useFamilyTree();
  const { persons, focusedPersonId, degreeFilter } = state;

  const degrees = useMemo(
    () => computeKinshipDegrees(persons, focusedPersonId),
    [persons, focusedPersonId]
  );

  const layoutNodes = useMemo(
    () => computeLayout(persons, focusedPersonId, degrees, degreeFilter),
    [persons, focusedPersonId, degrees, degreeFilter]
  );

  const { svgRef, fitToView } = useD3Zoom<SVGSVGElement>();

  useEffect(() => {
    const timer = setTimeout(() => {
      fitToView(layoutNodes, window.innerWidth, window.innerHeight);
    }, 100);
    return () => clearTimeout(timer);
  }, [layoutNodes, fitToView]);

  const handleNodeClick = useCallback(
    (id: string) => {
      dispatch({ type: "SET_FOCUSED", id });
    },
    [dispatch]
  );

  const personById = useMemo(
    () => new Map(persons.map((p) => [p.id, p])),
    [persons]
  );

  return (
    <svg
      ref={svgRef}
      className="w-full h-full bg-[#0f172a]"
      style={{ cursor: "grab" }}
    >
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g className="zoom-group">
        {/* ConnectionLines and PersonNodes will be added in Task 11 */}
        {layoutNodes.map((node) => {
          const person = personById.get(node.id);
          if (!person) return null;
          return (
            <g
              key={node.id}
              transform={`translate(${node.x - 70}, ${node.y - 36})`}
              onClick={() => handleNodeClick(node.id)}
              style={{ cursor: "pointer" }}
            >
              <rect
                width={140}
                height={72}
                rx={8}
                fill={node.nodeType === "focused" ? "#2e1065" : "#1e293b"}
                stroke={
                  node.nodeType === "focused" ? "#a78bfa" :
                  node.nodeType === "spouse" ? "#f59e0b" :
                  node.nodeType === "ghost" ? "#475569" : "#3b82f6"
                }
                strokeWidth={node.nodeType === "focused" ? 2.5 : 1.5}
                strokeDasharray={node.nodeType === "ghost" ? "4 4" : "none"}
              />
              <text x={12} y={30} fill="#e2e8f0" fontSize={13} fontWeight={600}>
                {person.name}
              </text>
              <text x={12} y={50} fill="#94a3b8" fontSize={10}>
                {node.nodeType === "ghost" ? "?" : `Degree: ${node.degree}`}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
