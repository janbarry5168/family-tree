import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getRelationshipLabel } from "../engine/relationships";
import type { LayoutNode, Person } from "../types/person";

const NODE_W = 140;
const NODE_H = 72;
const PHOTO_R = 18;
const HIDE_BTN_SIZE = 18;
const HIDE_BTN_PAD = 4;

const STYLES = {
  focused: { border: "#f59e0b", fill: "#451a03", borderWidth: 2.5, dashArray: "none" },
  blood: { border: "#3b82f6", fill: "#1e293b", borderWidth: 1.5, dashArray: "none" },
  spouse: { border: "#a78bfa", fill: "#1e293b", borderWidth: 1.5, dashArray: "none" },
};

interface Props {
  node: LayoutNode;
  person: Person;
  focusedId: string;
  persons: Person[];
  isSelected: boolean;
  canHide: boolean;
  isHidden: boolean;
  onSelect: (id: string) => void;
  onFocus: (id: string) => void;
  onToggleHidden: (id: string) => void;
}

export default function PersonNode({
  node,
  person,
  focusedId,
  persons,
  isSelected,
  canHide,
  isHidden,
  onSelect,
  onFocus,
  onToggleHidden,
}: Props) {
  const { t, i18n } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const style = STYLES[node.nodeType];

  const label = getRelationshipLabel(focusedId, person.id, persons);
  const displayLabel = i18n.language === "zh-TW" ? label.zhTW : label.en;
  const initials = person.name.charAt(0);
  const x = node.x - NODE_W / 2;
  const y = node.y - NODE_H / 2;

  const showSelectionRing = isSelected && node.nodeType !== "focused";

  return (
    <g
      data-person-node
      transform={`translate(${x}, ${y})`}
      onClick={() => onSelect(person.id)}
      onDoubleClick={() => onFocus(person.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: "pointer" }}
    >
      {hovered && (
        <rect width={NODE_W + 4} height={NODE_H + 4} x={-2} y={-2} rx={10}
          fill="none" stroke={style.border} strokeWidth={2} opacity={0.5} filter="url(#glow)" />
      )}

      {showSelectionRing && (
        <rect data-role="selection-ring"
          width={NODE_W + 4} height={NODE_H + 4} x={-2} y={-2} rx={10}
          fill="none" stroke="#e2e8f0" strokeWidth={1.5} opacity={0.9} />
      )}

      <rect width={NODE_W} height={NODE_H} rx={8}
        fill={style.fill} stroke={style.border}
        strokeWidth={style.borderWidth} strokeDasharray={style.dashArray} />

      {node.nodeType === "focused" && (
        <rect width={NODE_W} height={NODE_H} rx={8} fill="none" stroke="#f59e0b" strokeWidth={1} opacity={0.4}>
          <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
        </rect>
      )}

      <circle cx={PHOTO_R + 8} cy={NODE_H / 2} r={PHOTO_R}
        fill="#334155" stroke={style.border} strokeWidth={1} />
      {person.photo ? (
        <image href={person.photo} x={8} y={NODE_H / 2 - PHOTO_R}
          width={PHOTO_R * 2} height={PHOTO_R * 2}
          clipPath={`circle(${PHOTO_R}px at ${PHOTO_R}px ${PHOTO_R}px)`} />
      ) : (
        <text x={PHOTO_R + 8} y={NODE_H / 2 + 5} textAnchor="middle"
          fill="#94a3b8" fontSize={14} fontWeight="bold">
          {initials}
        </text>
      )}

      <text x={PHOTO_R * 2 + 16} y={NODE_H / 2 - 6}
        fill="#e2e8f0" fontSize={13} fontWeight={600}>
        {person.name}
      </text>

      <text x={PHOTO_R * 2 + 16} y={NODE_H / 2 + 12}
        fill={style.border} fontSize={10}>
        {displayLabel}
      </text>

      {canHide && (
        <g
          data-role="hide-toggle"
          role="button"
          tabIndex={0}
          transform={`translate(${NODE_W - HIDE_BTN_SIZE - HIDE_BTN_PAD}, ${HIDE_BTN_PAD})`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleHidden(person.id);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggleHidden(person.id);
            }
          }}
          style={{ cursor: "pointer" }}
        >
          <title>{isHidden ? t("tree.showBranch") : t("tree.hideBranch")}</title>
          <circle
            cx={HIDE_BTN_SIZE / 2}
            cy={HIDE_BTN_SIZE / 2}
            r={HIDE_BTN_SIZE / 2}
            fill="#0f172a"
            stroke={style.border}
            strokeWidth={1}
          />
          {isHidden ? (
            <g stroke="#e2e8f0" strokeWidth={1.2} fill="none" strokeLinecap="round">
              <path d={`M 3 ${HIDE_BTN_SIZE / 2} Q ${HIDE_BTN_SIZE / 2} 4 ${HIDE_BTN_SIZE - 3} ${HIDE_BTN_SIZE / 2} Q ${HIDE_BTN_SIZE / 2} ${HIDE_BTN_SIZE - 4} 3 ${HIDE_BTN_SIZE / 2} Z`} />
              <line x1="3" y1={HIDE_BTN_SIZE - 3} x2={HIDE_BTN_SIZE - 3} y2="3" />
            </g>
          ) : (
            <g stroke="#e2e8f0" strokeWidth={1.2} fill="none">
              <path d={`M 3 ${HIDE_BTN_SIZE / 2} Q ${HIDE_BTN_SIZE / 2} 4 ${HIDE_BTN_SIZE - 3} ${HIDE_BTN_SIZE / 2} Q ${HIDE_BTN_SIZE / 2} ${HIDE_BTN_SIZE - 4} 3 ${HIDE_BTN_SIZE / 2} Z`} />
              <circle cx={HIDE_BTN_SIZE / 2} cy={HIDE_BTN_SIZE / 2} r="1.6" fill="#e2e8f0" stroke="none" />
            </g>
          )}
        </g>
      )}
    </g>
  );
}

export { NODE_W, NODE_H };
