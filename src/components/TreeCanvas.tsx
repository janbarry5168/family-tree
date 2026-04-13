import { useEffect, useMemo, useCallback } from "react";
import { useFamilyTree } from "../context/FamilyTreeContext";
import { computeKinshipDegrees } from "../engine/kinship";
import { computeLayout } from "../engine/layout";
import { useD3Zoom } from "../hooks/useD3Zoom";
import PersonNode from "./PersonNode";
import ConnectionLines from "./ConnectionLines";

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
        <ConnectionLines layoutNodes={layoutNodes} persons={persons} personById={personById} />
        {layoutNodes.map((node) => {
          const person = personById.get(node.id);
          if (!person) return null;
          return (
            <PersonNode key={node.id} node={node} person={person}
              focusedId={focusedPersonId} persons={persons} onClick={handleNodeClick} />
          );
        })}
      </g>
    </svg>
  );
}
