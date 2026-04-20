import { useEffect, useMemo, useCallback } from "react";
import { useFamilyTree } from "../context/FamilyTreeContext";
import { computeKinshipDegrees } from "../engine/kinship";
import { computeLayout } from "../engine/layout";
import { computeHiddenIds, computeArticulationPoints } from "../engine/hiddenReachability";
import { useD3Zoom } from "../hooks/useD3Zoom";
import PersonNode from "./PersonNode";
import ConnectionLines from "./ConnectionLines";

export default function TreeCanvas() {
  const { state, dispatch } = useFamilyTree();
  const { persons, focusedPersonId, selectedPersonId, degreeFilter, hiddenPersonIds } = state;

  const hiddenToggles = useMemo(() => new Set(hiddenPersonIds), [hiddenPersonIds]);

  const degrees = useMemo(
    () => computeKinshipDegrees(persons, focusedPersonId),
    [persons, focusedPersonId]
  );

  const hiddenIds = useMemo(
    () => computeHiddenIds(persons, focusedPersonId, hiddenToggles),
    [persons, focusedPersonId, hiddenToggles]
  );

  const articulationIds = useMemo(
    () => computeArticulationPoints(persons, focusedPersonId, hiddenToggles),
    [persons, focusedPersonId, hiddenToggles]
  );

  const layoutNodes = useMemo(
    () => computeLayout(persons, focusedPersonId, degrees, degreeFilter, hiddenIds),
    [persons, focusedPersonId, degrees, degreeFilter, hiddenIds]
  );

  const { svgRef, fitToView } = useD3Zoom<SVGSVGElement>();

  useEffect(() => {
    const timer = setTimeout(() => {
      fitToView(layoutNodes, window.innerWidth, window.innerHeight);
    }, 100);
    return () => clearTimeout(timer);
  }, [layoutNodes, fitToView]);

  const handleSelect = useCallback(
    (id: string) => dispatch({ type: "SET_SELECTED", id }),
    [dispatch]
  );

  const handleFocus = useCallback(
    (id: string) => dispatch({ type: "SET_FOCUSED", id }),
    [dispatch]
  );

  const handleToggleHidden = useCallback(
    (id: string) => dispatch({ type: "TOGGLE_PERSON_HIDDEN", id }),
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
        <ConnectionLines layoutNodes={layoutNodes} personById={personById} />
        {layoutNodes.map((node) => {
          const person = personById.get(node.id);
          if (!person) return null;
          const isHidden = hiddenToggles.has(node.id);
          const canHide =
            node.id !== focusedPersonId && (isHidden || articulationIds.has(node.id));
          return (
            <PersonNode
              key={node.id}
              node={node}
              person={person}
              focusedId={focusedPersonId}
              persons={persons}
              isSelected={node.id === selectedPersonId}
              canHide={canHide}
              isHidden={isHidden}
              onSelect={handleSelect}
              onFocus={handleFocus}
              onToggleHidden={handleToggleHidden}
            />
          );
        })}
      </g>
    </svg>
  );
}
