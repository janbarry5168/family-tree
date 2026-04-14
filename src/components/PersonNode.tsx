import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getRelationshipLabel } from "../engine/relationships";
import type { LayoutNode, Person } from "../types/person";

const NODE_W = 140;
const NODE_H = 72;
const PHOTO_R = 18;

const STYLES = {
  focused: { border: "#a78bfa", fill: "#2e1065", borderWidth: 2.5, dashArray: "none" },
  blood: { border: "#3b82f6", fill: "#1e293b", borderWidth: 1.5, dashArray: "none" },
  spouse: { border: "#f59e0b", fill: "#1e293b", borderWidth: 1.5, dashArray: "none" },
  ghost: { border: "#475569", fill: "transparent", borderWidth: 1, dashArray: "4 4" },
};

interface Props {
  node: LayoutNode;
  person: Person;
  focusedId: string;
  persons: Person[];
  onClick: (id: string) => void;
  isLabelHidden: boolean;
  onToggleLabel: (id: string) => void;
}

export default function PersonNode({ node, person, focusedId, persons, onClick, isLabelHidden, onToggleLabel }: Props) {
  const { i18n } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const style = STYLES[node.nodeType];

  const label = getRelationshipLabel(focusedId, person.id, persons);
  const displayLabel = i18n.language === "zh-TW" ? label.zhTW : label.en;
  const initials = person.name.charAt(0);
  const x = node.x - NODE_W / 2;
  const y = node.y - NODE_H / 2;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={() => onClick(person.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: "pointer" }}
    >
      {/* Hover glow */}
      {hovered && (
        <rect width={NODE_W + 4} height={NODE_H + 4} x={-2} y={-2} rx={10}
          fill="none" stroke={style.border} strokeWidth={2} opacity={0.5} filter="url(#glow)" />
      )}

      {/* Card background */}
      <rect width={NODE_W} height={NODE_H} rx={8}
        fill={style.fill} stroke={style.border}
        strokeWidth={style.borderWidth} strokeDasharray={style.dashArray} />

      {/* Pulse animation for focused */}
      {node.nodeType === "focused" && (
        <rect width={NODE_W} height={NODE_H} rx={8} fill="none" stroke="#a78bfa" strokeWidth={1} opacity={0.4}>
          <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
        </rect>
      )}

      {/* Photo circle or initials */}
      <circle cx={PHOTO_R + 8} cy={NODE_H / 2} r={PHOTO_R}
        fill="#334155" stroke={style.border} strokeWidth={1} />
      {person.photo ? (
        <image href={person.photo} x={8} y={NODE_H / 2 - PHOTO_R}
          width={PHOTO_R * 2} height={PHOTO_R * 2}
          clipPath={`circle(${PHOTO_R}px at ${PHOTO_R}px ${PHOTO_R}px)`} />
      ) : (
        <text x={PHOTO_R + 8} y={NODE_H / 2 + 5} textAnchor="middle"
          fill="#94a3b8" fontSize={14} fontWeight="bold">
          {node.nodeType === "ghost" ? "?" : initials}
        </text>
      )}

      {/* Name */}
      <text x={PHOTO_R * 2 + 16} y={NODE_H / 2 - 6}
        fill="#e2e8f0" fontSize={13} fontWeight={600}>
        {person.name}
      </text>

      {/* Relationship label */}
      {!isLabelHidden && (
        <text x={PHOTO_R * 2 + 16} y={NODE_H / 2 + 12}
          fill={style.border} fontSize={10}>
          {displayLabel}
        </text>
      )}

      {/* Toggle label icon */}
      <g
        transform={`translate(${NODE_W - 22}, ${NODE_H / 2 + 2})`}
        onClick={(e) => { e.stopPropagation(); onToggleLabel(person.id); }}
        style={{ cursor: "pointer" }}
        opacity={0.5}
      >
        {isLabelHidden ? (
          <g fill="none" stroke={style.border} strokeWidth={1.2}>
            <path d="M1 7 Q7 1 13 7 Q7 13 1 7" />
            <line x1="1" y1="1" x2="13" y2="13" />
          </g>
        ) : (
          <g fill="none" stroke={style.border} strokeWidth={1.2}>
            <path d="M1 7 Q7 1 13 7 Q7 13 1 7" />
            <circle cx="7" cy="7" r="2.5" />
          </g>
        )}
      </g>
    </g>
  );
}

export { NODE_W, NODE_H };
